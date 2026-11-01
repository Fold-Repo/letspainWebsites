"use client";

import { useState, type FormEvent } from "react";
import { formatGbp } from "@/lib/money";

type Lookup = {
  code: string;
  guest: string;
  email: string;
  party: number;
  adults: number;
  children: number;
  paymentStatus: string;
  checkedInAt: string | null;
  checkedInBy: string | null;
  amountPence: number | null;
  eventName: string;
  items: Array<{ name: string; quantity: number; seats: number }>;
};

export function CheckInPanel() {
  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  /** True only right after a successful admit in this session — not a lookup of an old check-in. */
  const [justCheckedIn, setJustCheckedIn] = useState(false);

  async function findTicket(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setLookup(null);
    setJustCheckedIn(false);
    try {
      const response = await fetch(`/api/admin/check-in?code=${encodeURIComponent(code.trim())}`);
      const data = (await response.json()) as { booking?: Lookup; message?: string };
      if (!response.ok || !data.booking) {
        setMessage(data.message ?? "Ticket not found.");
        setPending(false);
        return;
      }
      setLookup(data.booking);
      setJustCheckedIn(false);
    } catch {
      setMessage("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  async function admit() {
    if (!lookup) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: lookup.code }),
      });
      const data = (await response.json()) as {
        message?: string;
        checkedInAt?: string;
        checkedInBy?: string;
      };
      if (!response.ok) {
        setMessage(data.message ?? "Check-in failed.");
        // Refresh lookup so a race/double-tap shows the real checked-in time.
        if (response.status === 409) {
          const again = await fetch(`/api/admin/check-in?code=${encodeURIComponent(lookup.code)}`);
          const againData = (await again.json()) as { booking?: Lookup };
          if (againData.booking) {
            setLookup(againData.booking);
            setJustCheckedIn(false);
          }
        }
        return;
      }
      setMessage(data.message ?? "Checked in.");
      setJustCheckedIn(true);
      setLookup({
        ...lookup,
        checkedInAt: data.checkedInAt ?? new Date().toISOString(),
        checkedInBy: data.checkedInBy ?? lookup.checkedInBy,
      });
    } catch {
      setMessage("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  async function undoCheckIn() {
    if (!lookup?.checkedInAt) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/check-in", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: lookup.code }),
      });
      const data = (await response.json()) as { message?: string; booking?: Lookup };
      if (!response.ok) {
        setMessage(data.message ?? "Could not undo check-in.");
        return;
      }
      setJustCheckedIn(false);
      setLookup(data.booking ?? { ...lookup, checkedInAt: null, checkedInBy: null });
      setMessage(data.message ?? "Check-in cleared.");
    } catch {
      setMessage("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={findTicket} className="flex flex-wrap gap-3">
        <label className="block min-w-[16rem] flex-1 text-sm">
          Booking code or scan
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="LAP-XXXXXX"
            className="field"
            autoFocus
            required
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="mt-6 rounded-full bg-burgundy px-5 py-3 text-sm text-cream disabled:opacity-60"
        >
          Look up
        </button>
      </form>

      {lookup ? (
        <article className="rounded-[1.4rem] bg-white p-5">
          <p className="text-xs tracking-[0.14em] text-burgundy uppercase">
            {lookup.code} · {lookup.paymentStatus}
            {lookup.checkedInAt ? (justCheckedIn ? " · checked in" : " · already in") : ""}
          </p>
          <h2 className="mt-2 font-display text-3xl">{lookup.guest}</h2>
          <p className="mt-1 text-sm text-ink/80">{lookup.eventName}</p>
          <p className="mt-2 text-sm">
            {lookup.adults} adult{lookup.adults === 1 ? "" : "s"}
            {lookup.children > 0
              ? `, ${lookup.children} child${lookup.children === 1 ? "" : "ren"}`
              : ""}
            {lookup.amountPence != null ? ` · ${formatGbp(lookup.amountPence)}` : ""}
          </p>
          {lookup.items.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-ink/80">
              {lookup.items.map((item) => (
                <li key={`${item.name}-${item.quantity}`}>
                  {item.quantity} × {item.name} ({item.seats} seat{item.seats === 1 ? "" : "s"})
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-2 text-sm">
            <a className="text-burgundy" href={`mailto:${lookup.email}`}>
              {lookup.email}
            </a>
          </p>

          {lookup.checkedInAt && justCheckedIn ? (
            <div className="mt-4 space-y-3">
              <p className="rounded-2xl bg-[color-mix(in_srgb,#1f7a4d_14%,white)] px-4 py-3 text-sm text-[#1f7a4d]">
                Checked in successfully at {new Date(lookup.checkedInAt).toLocaleString("en-GB")}.
                {lookup.checkedInBy ? ` · ${lookup.checkedInBy}` : ""}
              </p>
              <button
                type="button"
                onClick={() => {
                  setCode("");
                  setLookup(null);
                  setJustCheckedIn(false);
                  setMessage("");
                }}
                className="rounded-full bg-burgundy px-5 py-3 text-sm text-cream"
              >
                Next guest
              </button>
            </div>
          ) : lookup.checkedInAt ? (
            <div className="mt-4 space-y-3">
              <p className="rounded-2xl bg-pink/40 px-4 py-3 text-sm">
                Already checked in at {new Date(lookup.checkedInAt).toLocaleString("en-GB")}
                {lookup.checkedInBy ? ` by ${lookup.checkedInBy}` : ""}. Duplicate admission is
                blocked.
              </p>
              <button
                type="button"
                onClick={() => void undoCheckIn()}
                disabled={pending}
                className="rounded-full border border-burgundy/25 px-5 py-3 text-sm font-semibold text-burgundy disabled:opacity-60"
              >
                {pending ? "Working…" : "Undo check-in"}
              </button>
            </div>
          ) : lookup.paymentStatus === "paid" || lookup.paymentStatus === "free" ? (
            <button
              type="button"
              onClick={() => void admit()}
              disabled={pending}
              className="mt-4 rounded-full bg-burgundy px-5 py-3 text-sm text-cream disabled:opacity-60"
            >
              {pending ? "Checking in…" : "Check in"}
            </button>
          ) : (
            <p className="mt-4 rounded-2xl bg-pink/40 px-4 py-3 text-sm">
              This ticket is not paid yet. Do not admit until payment is complete.
            </p>
          )}
        </article>
      ) : null}
      {message ? <p className="text-sm text-ink/80">{message}</p> : null}
    </div>
  );
}
