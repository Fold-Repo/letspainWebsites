"use client";

import { useState, type FormEvent } from "react";
import { supportEmail } from "@/lib/event";

type Preview = {
  code: string;
  guestName: string;
  emailMasked: string;
  eventName: string;
  whenLabel: string;
  amountLabel: string;
  paymentStatus: string;
  checkedIn: boolean;
  canRequest: boolean;
  blockReason: string | null;
};

type Step = "lookup" | "preview" | "done";

export function RefundRequestForm() {
  const [step, setStep] = useState<Step>("lookup");
  const [code, setCode] = useState("");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function onLookup(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setPreview(null);
    try {
      const response = await fetch(`/api/refunds/lookup?code=${encodeURIComponent(code.trim())}`);
      const data = (await response.json()) as { message?: string; preview?: Preview };
      if (!response.ok || !data.preview) {
        setMessage(data.message ?? "We could not find that booking.");
        return;
      }
      setPreview(data.preview);
      setStep("preview");
    } catch {
      setMessage("Could not reach the server. Try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  async function onConfirm(event: FormEvent) {
    event.preventDefault();
    if (!preview?.canRequest) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: preview.code, reason }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(data.message ?? "Could not submit that request.");
        return;
      }
      setMessage(data.message ?? "Refund request submitted.");
      setStep("done");
    } catch {
      setMessage("Could not reach the server. Try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  if (step === "done") {
    return (
      <div className="rounded-[1.6rem] bg-white p-5 sm:p-8" role="status">
        <h2 className="font-display text-3xl text-ink">Request received</h2>
        <p className="mt-3 text-ink/75 leading-relaxed">{message}</p>
        <p className="mt-4 text-sm text-ink/60">
          Need anything else?{" "}
          <a className="text-burgundy" href={`mailto:${supportEmail()}`}>
            {supportEmail()}
          </a>
        </p>
      </div>
    );
  }

  if (step === "preview" && preview) {
    return (
      <div className="rounded-[1.6rem] bg-white p-5 sm:p-8">
        <h2 className="font-display text-3xl text-ink">Confirm refund request</h2>
        <p className="mt-2 text-sm text-ink/60">Check these details match your booking before you continue.</p>

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-burgundy/8 pb-2">
            <dt className="text-ink/55">Booking</dt>
            <dd className="font-semibold tracking-wide text-burgundy">{preview.code}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-burgundy/8 pb-2">
            <dt className="text-ink/55">Guest</dt>
            <dd className="font-medium text-ink">{preview.guestName}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-burgundy/8 pb-2">
            <dt className="text-ink/55">Email</dt>
            <dd className="text-ink">{preview.emailMasked}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-burgundy/8 pb-2">
            <dt className="text-ink/55">Hangout</dt>
            <dd className="text-right font-medium text-ink">
              {preview.eventName}
              {preview.whenLabel ? <span className="block text-xs font-normal text-ink/50">{preview.whenLabel}</span> : null}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink/55">Amount</dt>
            <dd className="font-semibold text-ink">{preview.amountLabel}</dd>
          </div>
        </dl>

        {!preview.canRequest ? (
          <div className="mt-6 rounded-2xl bg-pink/35 px-4 py-3 text-sm text-ink">
            <p>{preview.blockReason}</p>
            {preview.checkedIn ? (
              <p className="mt-2">
                Email{" "}
                <a className="font-semibold text-burgundy" href={`mailto:${supportEmail()}`}>
                  {supportEmail()}
                </a>{" "}
                and we will help resolve any issue.
              </p>
            ) : null}
          </div>
        ) : (
          <form onSubmit={onConfirm} className="mt-6 space-y-4">
            <label className="block text-sm">
              Why do you need a refund?
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                required
                minLength={8}
                rows={4}
                className="field"
                placeholder="A short note helps us review your request."
              />
            </label>
            {message ? (
              <p role="alert" className="text-sm text-burgundy">
                {message}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep("lookup");
                  setPreview(null);
                  setMessage("");
                }}
                className="rounded-full border border-burgundy/20 px-5 py-3 text-sm font-medium text-ink"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-full bg-burgundy px-5 py-3 text-sm font-medium text-cream disabled:opacity-60"
              >
                {pending ? "Submitting…" : "Confirm refund request"}
              </button>
            </div>
          </form>
        )}

        {!preview.canRequest ? (
          <button
            type="button"
            onClick={() => {
              setStep("lookup");
              setPreview(null);
              setMessage("");
            }}
            className="mt-5 rounded-full border border-burgundy/20 px-5 py-3 text-sm font-medium text-ink"
          >
            Try another booking
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={onLookup} className="space-y-4 rounded-[1.6rem] bg-white p-5 sm:p-8">
      <label className="block text-sm">
        Booking reference
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          required
          autoComplete="off"
          placeholder="LAP-XXXXXX"
          className="field font-mono tracking-wide"
        />
      </label>
      <p className="text-xs text-ink/55">
        Find this on your voucher email or confirmation page. If you attended and were checked in, email{" "}
        <a className="text-burgundy" href={`mailto:${supportEmail()}`}>
          {supportEmail()}
        </a>{" "}
        instead.
      </p>
      {message ? (
        <p role="alert" className="text-sm text-burgundy">
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-burgundy px-5 py-3 text-sm font-medium text-cream disabled:opacity-60"
      >
        {pending ? "Looking up…" : "Preview booking"}
      </button>
    </form>
  );
}
