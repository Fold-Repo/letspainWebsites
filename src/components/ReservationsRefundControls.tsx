"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { RefundReviewModal, type RefundReviewItem } from "./RefundReviewModal";

export type { RefundReviewItem };

type RefundUiContextValue = {
  hasPending: (code: string) => boolean;
  openForCode: (code: string) => void;
  pending: RefundReviewItem[];
};

const RefundUiContext = createContext<RefundUiContextValue | null>(null);

function useRefundUi() {
  const value = useContext(RefundUiContext);
  if (!value) {
    throw new Error("Refund UI components must be used inside ReservationsRefundProvider.");
  }
  return value;
}

/** Client provider — server pages pass JSX children (not functions). */
export function ReservationsRefundProvider({
  pending,
  children,
}: {
  pending: RefundReviewItem[];
  children: ReactNode;
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

  const hasPending = useCallback((code: string) => byCode.has(code), [byCode]);
  const openForCode = useCallback(
    (code: string) => {
      const item = byCode.get(code);
      if (item) setActiveId(item.id);
    },
    [byCode],
  );

  const value = useMemo(
    () => ({ hasPending, openForCode, pending }),
    [hasPending, openForCode, pending],
  );

  return (
    <RefundUiContext.Provider value={value}>
      {children}
      <RefundReviewModal item={active} open={activeId != null} onClose={() => setActiveId(null)} />
    </RefundUiContext.Provider>
  );
}

export function RefundPendingBanner() {
  const { pending, openForCode } = useRefundUi();
  if (pending.length === 0) return null;

  return (
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
          <button
            key={item.id}
            type="button"
            onClick={() => openForCode(item.bookingCode)}
            className="admin-chip"
          >
            {item.bookingCode}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReviewRefundButton({ code }: { code: string }) {
  const { hasPending, openForCode } = useRefundUi();
  if (!hasPending(code)) return null;
  return (
    <button
      type="button"
      onClick={() => openForCode(code)}
      className="mt-2 rounded-full bg-burgundy px-3 py-1.5 text-xs font-semibold text-cream"
    >
      Review refund
    </button>
  );
}
