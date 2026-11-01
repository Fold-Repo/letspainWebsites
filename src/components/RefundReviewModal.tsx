"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { formatGbp } from "@/lib/money";

export type RefundReviewItem = {
  id: number;
  bookingCode: string;
  reason: string;
  requestedAt: string;
  guestName: string;
  email: string;
  eventName: string;
  amountPence: number | null;
  checkedIn: boolean;
  paymentStatus: string;
};

export function RefundReviewModal({
  item,
  open,
  onClose,
}: {
  item: RefundReviewItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const [rejectionReason, setRejectionReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setRejectionReason("");
    setMessage("");
    setPending(false);
  }, [open, item?.id]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !item) return null;

  async function decide(decision: "approve" | "reject") {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/refunds/${item!.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          rejectionReason: decision === "reject" ? rejectionReason : undefined,
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(data.message ?? "Could not update that refund.");
        return;
      }
      setMessage(data.message ?? "Updated.");
      router.refresh();
      window.setTimeout(() => onClose(), 700);
    } catch {
      setMessage("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-4 sm:items-center" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-lg rounded-[1.4rem] bg-white p-5 shadow-xl sm:p-6"
      >
        <h3 id={titleId} className="text-lg font-semibold text-ink">
          Refund request · {item.bookingCode}
        </h3>
        <p className="mt-1 text-sm text-ink/55">
          Requested {new Date(item.requestedAt).toLocaleString("en-GB")}
        </p>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink/55">Guest</dt>
            <dd className="text-right font-medium text-ink">
              {item.guestName}
              <span className="block text-xs font-normal text-ink/50">{item.email}</span>
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink/55">Hangout</dt>
            <dd className="text-right text-ink">{item.eventName}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink/55">Amount</dt>
            <dd className="font-semibold text-ink">
              {item.amountPence != null ? formatGbp(item.amountPence) : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink/55">Status</dt>
            <dd className="text-ink">
              {item.checkedIn ? "Checked in" : item.paymentStatus}
            </dd>
          </div>
        </dl>

        <div className="mt-4 rounded-2xl bg-cream/80 px-4 py-3 text-sm text-ink/80">
          <p className="text-xs tracking-[0.12em] text-burgundy/70 uppercase">Guest reason</p>
          <p className="mt-1 whitespace-pre-wrap">{item.reason}</p>
        </div>

        {item.checkedIn ? (
          <p className="mt-4 rounded-2xl bg-pink/35 px-4 py-3 text-sm">
            Checked in — approving is blocked. Reject with a note, or handle offline.
          </p>
        ) : null}

        <label className="mt-4 block text-sm">
          Rejection reason (required to reject)
          <textarea
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            rows={3}
            className="field"
            placeholder="Shared with the guest by email."
          />
        </label>

        {message ? <p className="mt-3 text-sm text-ink/80">{message}</p> : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-burgundy/15 px-4 py-2 text-sm">
            Close
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void decide("reject")}
            className="rounded-full border border-burgundy/25 px-4 py-2 text-sm font-semibold text-burgundy disabled:opacity-60"
          >
            {pending ? "Working…" : "Reject"}
          </button>
          <button
            type="button"
            disabled={pending || item.checkedIn || item.paymentStatus !== "paid"}
            onClick={() => void decide("approve")}
            className="rounded-full bg-burgundy px-4 py-2 text-sm font-semibold text-cream disabled:opacity-60"
          >
            {pending ? "Working…" : "Approve & refund"}
          </button>
        </div>
      </div>
    </div>
  );
}
