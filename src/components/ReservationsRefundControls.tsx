"use client";

import { useMemo, useState, type ReactNode } from "react";
import { RefundReviewModal, type RefundReviewItem } from "./RefundReviewModal";

export type { RefundReviewItem };

/** Client shell that owns modal state for the reservations table. */
export function ReservationsWithRefunds({
  pending,
  children,
}: {
  pending: RefundReviewItem[];
  children: (api: {
    ReviewButton: (props: { code: string }) => ReactNode;
    PendingBanner: ReactNode;
    hasPending: (code: string) => boolean;
  }) => ReactNode;
}) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const active = useMemo(
    () => pending.find((item) => item.id === activeId) ?? null,
    [pending, activeId],
  );
  const byCode = useMemo(() => {
    const map = new Map<string, RefundReviewItem>();
    for (const item of pending) map.set(item.bookingCode, item);
    return map;
  }, [pending]);

  function ReviewButton({ code }: { code: string }) {
    const item = byCode.get(code);
    if (!item) return null;
    return (
      <button
        type="button"
        onClick={() => setActiveId(item.id)}
        className="mt-2 rounded-full bg-burgundy px-3 py-1.5 text-xs font-semibold text-cream"
      >
        Review refund
      </button>
    );
  }

  const PendingBanner =
    pending.length > 0 ? (
      <div className="admin-card flex flex-wrap items-center justify-between gap-3 border border-burgundy/15 bg-pink/20 px-5 py-4">
        <div>
          <p className="font-semibold text-ink">
            {pending.length} refund request{pending.length === 1 ? "" : "s"} waiting
          </p>
          <p className="text-sm text-ink/60">
            Open a request to see details, approve (Stripe refund + email), or reject with a reason.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {pending.slice(0, 6).map((item) => (
            <button key={item.id} type="button" onClick={() => setActiveId(item.id)} className="admin-chip">
              {item.bookingCode}
            </button>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <>
      {children({
        ReviewButton,
        PendingBanner,
        hasPending: (code) => byCode.has(code),
      })}
      <RefundReviewModal item={active} open={activeId != null} onClose={() => setActiveId(null)} />
    </>
  );
}
