"use client";

import { PaymentLinkForm } from "@/components/PaymentLinkForm";
import {
  RefundPendingBanner,
  ReviewRefundButton,
  type RefundReviewItem,
} from "@/components/ReservationsRefundControls";
import { formatGbp } from "@/lib/money";

type CartItem = {
  id: number;
  quantity: number;
  categoryName: string;
};

type Cart = {
  code: string;
  items: CartItem[];
  total: number | null;
};

type BookingRow = {
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  eventSlug: string;
  eventName: string;
  adults: number;
  children: number;
  createdAt: string;
  paymentStatus: "unpaid" | "link_sent" | "paid" | "free" | "refunded";
  pricingChoice: "per_person" | "family" | "custom";
  amountPence: number | null;
  checkedInAt: string | null;
  isFree: boolean;
  pricePence: number | null;
  familyPricePence: number | null;
};

function statusLabel(booking: BookingRow, hasPendingRefund: boolean) {
  if (hasPendingRefund) return "Refund requested";
  if (booking.paymentStatus === "refunded") return "Refunded";
  if (booking.checkedInAt) return "Checked in";
  if (booking.paymentStatus === "paid") return "Paid";
  if (booking.paymentStatus === "free") return "Free";
  if (booking.paymentStatus === "link_sent") return "Link sent";
  return "Unpaid";
}

function statusBadge(booking: BookingRow, hasPendingRefund: boolean) {
  if (hasPendingRefund) return "admin-badge admin-badge-refund";
  if (booking.paymentStatus === "refunded") return "admin-badge admin-badge-refunded";
  if (booking.checkedInAt) return "admin-badge admin-badge-in";
  if (booking.paymentStatus === "paid") return "admin-badge admin-badge-paid";
  if (booking.paymentStatus === "free") return "admin-badge admin-badge-free";
  if (booking.paymentStatus === "link_sent") return "admin-badge admin-badge-link";
  return "admin-badge admin-badge-unpaid";
}

export function ReservationsTable({
  bookings,
  carts,
  pendingCodes,
  empty,
}: {
  bookings: BookingRow[];
  carts: Cart[];
  pendingCodes: string[];
  empty: boolean;
}) {
  const cartByCode = new Map(carts.map((cart) => [cart.code, cart]));
  const pendingSet = new Set(pendingCodes);

  if (empty) {
    return (
      <>
        <RefundPendingBanner />
        <section className="admin-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-burgundy/10 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-ink">Recent enrolments</h3>
              <p className="text-sm text-ink/50">
                Send payment links from the row actions. Review refunds when requested.
              </p>
            </div>
          </div>
          <p className="px-5 py-10 text-sm text-ink/60">No enrolments yet.</p>
        </section>
      </>
    );
  }

  return (
    <>
      <RefundPendingBanner />
      <section className="admin-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-burgundy/10 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-ink">Recent enrolments</h3>
            <p className="text-sm text-ink/50">
              Send payment links from the row actions. Review refunds when requested.
            </p>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Event</th>
                <th>Tickets</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => {
                const cart = cartByCode.get(booking.code);
                const pendingRefund = pendingSet.has(booking.code);
                const seats = booking.adults + booking.children;
                return (
                  <tr key={booking.code}>
                    <td>
                      <p className="font-semibold text-ink">
                        {booking.firstName} {booking.lastName}
                      </p>
                      <p className="text-xs text-ink/50">{booking.email}</p>
                      <p className="mt-1 text-[11px] tracking-wide text-burgundy/70 uppercase">
                        {booking.code}
                      </p>
                    </td>
                    <td>
                      <p className="font-medium text-ink">{booking.eventName}</p>
                      <p className="text-xs text-ink/50">
                        {booking.adults} adult{booking.adults === 1 ? "" : "s"}
                        {booking.children > 0
                          ? ` · ${booking.children} child${booking.children === 1 ? "" : "ren"}`
                          : ""}
                      </p>
                    </td>
                    <td>
                      {cart && cart.items.length > 0 ? (
                        <ul className="space-y-0.5 text-xs text-ink/70">
                          {cart.items.map((item) => (
                            <li key={item.id}>
                              {item.quantity} × {item.categoryName}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-ink/45">—</span>
                      )}
                    </td>
                    <td>
                      <span className={statusBadge(booking, pendingRefund)}>
                        {statusLabel(booking, pendingRefund)}
                      </span>
                      <p className="mt-1 text-[11px] text-ink/45">
                        {new Date(booking.createdAt).toLocaleDateString("en-GB")}
                      </p>
                      <ReviewRefundButton code={booking.code} />
                    </td>
                    <td className="font-semibold text-ink">
                      {booking.amountPence ? formatGbp(booking.amountPence) : "—"}
                    </td>
                    <td className="min-w-[14rem]">
                      <PaymentLinkForm
                        code={booking.code}
                        paid={booking.paymentStatus === "paid" || booking.paymentStatus === "refunded"}
                        isFree={booking.isFree}
                        pricePence={booking.pricePence}
                        familyPricePence={booking.familyPricePence}
                        seats={seats}
                        pricingChoice={booking.pricingChoice}
                        cartTotalPence={cart?.total ?? booking.amountPence}
                        refunded={booking.paymentStatus === "refunded"}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export type { BookingRow, Cart, RefundReviewItem };
