import { listBookings, partySize, type Booking } from "./bookings";
import { listEvents } from "./events";
import { listPartnerships } from "./partnerships";
import { enrollmentState } from "./hangout";
import { countRefundsByStatus, syncRefundsFromStripe } from "./refunds";

export type DashboardDay = {
  date: string;
  label: string;
  enrolments: number;
  seats: number;
  paidPence: number;
};

export type DashboardSummary = {
  enrolments: number;
  seats: number;
  paid: number;
  unpaid: number;
  refunded: number;
  checkedIn: number;
  paidRevenuePence: number;
  refundedPence: number;
  pendingRefundRequests: number;
  approvedRefundRequests: number;
  stripeRefundSync: {
    checked: number;
    updated: number;
    pendingInStripe: number;
  };
  eventsTotal: number;
  eventsPublished: number;
  eventsOpen: number;
  partnerships: number;
  recent: Booking[];
  trend: DashboardDay[];
};

function dayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function buildTrend(bookings: Booking[], days = 14): DashboardDay[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const buckets = new Map<string, DashboardDay>();

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, {
      date: key,
      label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      enrolments: 0,
      seats: 0,
      paidPence: 0,
    });
  }

  for (const booking of bookings) {
    const key = dayKey(booking.createdAt);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.enrolments += 1;
    bucket.seats += partySize(booking);
    if (booking.paymentStatus === "paid" && booking.amountPence) {
      bucket.paidPence += booking.amountPence;
    }
  }

  return Array.from(buckets.values());
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  // Re-check Stripe so approved / offline refunds land as payment_status = refunded.
  const stripeRefundSync = await syncRefundsFromStripe(25).catch(() => ({
    checked: 0,
    updated: 0,
    pendingInStripe: 0,
  }));

  const [bookings, events, partnerships, refundCounts] = await Promise.all([
    listBookings(),
    listEvents(),
    listPartnerships().catch(() => []),
    countRefundsByStatus().catch(() => ({ pending: 0, approved: 0, rejected: 0 })),
  ]);

  const paid = bookings.filter((b) => b.paymentStatus === "paid").length;
  const unpaid = bookings.filter(
    (b) => b.paymentStatus === "unpaid" || b.paymentStatus === "link_sent",
  ).length;
  const refunded = bookings.filter((b) => b.paymentStatus === "refunded").length;
  const checkedIn = bookings.filter((b) => b.checkedInAt).length;
  const paidRevenuePence = bookings
    .filter((b) => b.paymentStatus === "paid")
    .reduce((sum, b) => sum + (b.amountPence ?? 0), 0);
  const refundedPence = bookings
    .filter((b) => b.paymentStatus === "refunded")
    .reduce((sum, b) => sum + (b.amountPence ?? 0), 0);
  const seats = bookings.reduce((sum, b) => sum + partySize(b), 0);

  return {
    enrolments: bookings.length,
    seats,
    paid,
    unpaid,
    refunded,
    checkedIn,
    paidRevenuePence,
    refundedPence,
    pendingRefundRequests: refundCounts.pending,
    approvedRefundRequests: refundCounts.approved,
    stripeRefundSync,
    eventsTotal: events.length,
    eventsPublished: events.filter((e) => e.published).length,
    eventsOpen: events.filter((e) => enrollmentState(e) === "open").length,
    partnerships: partnerships.length,
    recent: bookings.slice(0, 6),
    trend: buildTrend(bookings, 14),
  };
}
