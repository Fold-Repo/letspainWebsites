import { listBookings, partySize, type Booking } from "./bookings";
import { listEvents } from "./events";
import { listPartnerships } from "./partnerships";
import { enrollmentState } from "./hangout";

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
  checkedIn: number;
  paidRevenuePence: number;
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
  const [bookings, events, partnerships] = await Promise.all([
    listBookings(),
    listEvents(),
    listPartnerships().catch(() => []),
  ]);

  const paid = bookings.filter((b) => b.paymentStatus === "paid").length;
  const unpaid = bookings.filter(
    (b) => b.paymentStatus === "unpaid" || b.paymentStatus === "link_sent",
  ).length;
  const checkedIn = bookings.filter((b) => b.checkedInAt).length;
  const paidRevenuePence = bookings
    .filter((b) => b.paymentStatus === "paid")
    .reduce((sum, b) => sum + (b.amountPence ?? 0), 0);
  const seats = bookings.reduce((sum, b) => sum + partySize(b), 0);

  return {
    enrolments: bookings.length,
    seats,
    paid,
    unpaid,
    checkedIn,
    paidRevenuePence,
    eventsTotal: events.length,
    eventsPublished: events.filter((e) => e.published).length,
    eventsOpen: events.filter((e) => enrollmentState(e) === "open").length,
    partnerships: partnerships.length,
    recent: bookings.slice(0, 6),
    trend: buildTrend(bookings, 14),
  };
}
