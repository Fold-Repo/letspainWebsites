"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { formatGbp } from "@/lib/money";

export function PaymentLinkForm({
  code,
  paid,
  isFree,
  pricePence,
  familyPricePence,
  seats,
  pricingChoice,
}: {
  code: string;
  paid: boolean;
  isFree: boolean;
  pricePence: number | null;
  familyPricePence: number | null;
  seats: number;
  pricingChoice: "per_person" | "family" | "custom";
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"per_person" | "family" | "custom">(
    pricingChoice === "family" && familyPricePence ? "family" : "per_person",
  );
  const [customAmount, setCustomAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");

  if (paid) return <p className="text-sm text-burgundy">Paid</p>;
  if (isFree) return <p className="text-sm text-ink/70">Free event. No payment link.</p>;

  const standard = pricePence ? formatGbp(pricePence * seats) : "Set a price on the event";
  const family = familyPricePence ? formatGbp(familyPricePence) : "";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/bookings/${code}/payment-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, customAmount }),
      });
      const data = (await response.json()) as { message?: string; url?: string };
      setMessage(data.message ?? "Could not create the link.");
      if (data.url) setUrl(data.url);
      if (response.ok) router.refresh();
    } catch {
      setMessage("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <p className="text-sm font-medium">Email a payment link</p>
      <label className="flex items-start gap-2 text-sm">
        <input type="radio" checked={mode === "per_person"} onChange={() => setMode("per_person")} className="mt-1 accent-burgundy" />
        <span>Standard total {standard}{pricePence ? ` (${formatGbp(pricePence)} each)` : ""}</span>
      </label>
      {familyPricePence ? (
        <label className="flex items-start gap-2 text-sm">
          <input type="radio" checked={mode === "family"} onChange={() => setMode("family")} className="mt-1 accent-burgundy" />
          <span>Family or group price {family}</span>
        </label>
      ) : null}
      <label className="flex items-start gap-2 text-sm">
        <input type="radio" checked={mode === "custom"} onChange={() => setMode("custom")} className="mt-1 accent-burgundy" />
        <span>Custom price for this party</span>
      </label>
      {mode === "custom" ? (
        <label className="block text-sm">
          Custom amount (£)
          <input
            value={customAmount}
            onChange={(event) => setCustomAmount(event.target.value)}
            inputMode="decimal"
            placeholder="120.00"
            className="field"
            required
          />
        </label>
      ) : null}
      <button type="submit" disabled={pending} className="rounded-full bg-burgundy px-4 py-2 text-sm text-cream disabled:opacity-60">
        {pending ? "Creating link…" : "Email payment link"}
      </button>
      {message ? <p className="text-sm text-ink/80">{message}</p> : null}
      {url ? (
        <p className="break-all text-xs text-burgundy">
          <a href={url}>{url}</a>
        </p>
      ) : null}
    </form>
  );
}
