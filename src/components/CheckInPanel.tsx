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
  amountPence: number | null;
  eventName: string;
  items: Array<{ name: string; quantity: number; seats: number }>;
};

export function CheckInPanel() {
  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function findTicket(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setLookup(null);
    try {
      const response = await fetch(`/api/admin/check-in?code=${encodeURIComponent(code.trim())}`);
      const data = (await response.json()) as { booking?: Lookup; message?: string };
      if (!response.ok || !data.booking) {
        setMessage(data.message ?? "Ticket not found.");
        setPending(false);
        return;
      }
      setLookup(data.booking);
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
      const data = (await response.json()) as { message?: string; checkedInAt?: string };
      setMessage(data.message ?? "Check-in updated.");
      if (response.ok && data.checkedInAt) {
        setLookup({ ...lookup, checkedInAt: data.checkedInAt });
      }
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
            {lookup.checkedInAt ? " · already in" : ""}
          </p>
          <h2 className="mt-2 font-display text-3xl">{lookup.guest}</h2>
          <p className="mt-1 text-sm text-ink/80">{lookup.eventName}</p>
          <p className="mt-2 text-sm">
            {lookup.adults} adult{lookup.adults === 1 ? "" : "s"}
            {lookup.children > 0 ? `, ${lookup.children} child${lookup.children === 1 ? "" : "ren"}` : ""}
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
          {lookup.checkedInAt ? (
            <p className="mt-4 rounded-2xl bg-pink/40 px-4 py-3 text-sm">
              Already checked in at {new Date(lookup.checkedInAt).toLocaleString("en-GB")}. Duplicate admission is
              blocked.
            </p>
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
