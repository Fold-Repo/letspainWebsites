import Link from "next/link";
import { ReservationsRefundProvider } from "@/components/ReservationsRefundControls";
import { ReservationsTable, type BookingRow } from "@/components/ReservationsTable";
import { requirePageCapability } from "@/lib/admin-session";
import { bookingCart, guestName, listBookings, partySize, type Booking } from "@/lib/bookings";
import { listEvents, type Hangout } from "@/lib/events";
import { formatGbp } from "@/lib/money";
import { listPendingRefunds } from "@/lib/refunds";
import type { RefundReviewItem } from "@/components/ReservationsRefundControls";

export const dynamic = "force-dynamic";

export default async function AdminReservationsPage() {
  await requirePageCapability("bookings");

  let bookings: Booking[] = [];
  let events: Hangout[] = [];
  let pendingRefunds: Awaited<ReturnType<typeof listPendingRefunds>> = [];
  let error = "";
  try {
    [bookings, events, pendingRefunds] = await Promise.all([
      listBookings(),
      listEvents(),
      listPendingRefunds(),
    ]);
  } catch {
    error = "Postgres is not reachable. Start the database, then refresh.";
  }
  const bySlug = new Map(events.map((hangout) => [hangout.slug, hangout]));
  const bookingByCode = new Map(bookings.map((booking) => [booking.code, booking]));
  const carts = await Promise.all(
    bookings.map(async (booking) => {
      try {
        const items = await bookingCart(booking.code);
        const total = items.reduce((sum, item) => sum + item.unitPricePence * item.quantity, 0);
        return {
          code: booking.code,
          items: items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            categoryName: item.categoryName,
          })),
          total: items.length > 0 ? total : (null as number | null),
        };
      } catch {
        return { code: booking.code, items: [], total: null as number | null };
      }
    }),
  );

  const seats = bookings.reduce((sum, booking) => sum + partySize(booking), 0);
  const paid = bookings.filter((booking) => booking.paymentStatus === "paid").length;
  const unpaid = bookings.filter(
    (booking) => booking.paymentStatus === "unpaid" || booking.paymentStatus === "link_sent",
  ).length;
  const checkedIn = bookings.filter((booking) => booking.checkedInAt).length;
  const paidRevenue = bookings
    .filter((booking) => booking.paymentStatus === "paid")
    .reduce((sum, booking) => sum + (booking.amountPence ?? 0), 0);

  const pendingItems: RefundReviewItem[] = pendingRefunds.map((refund) => {
    const booking = bookingByCode.get(refund.bookingCode);
    const hangout = booking ? bySlug.get(booking.eventSlug) : undefined;
    return {
      id: refund.id,
      bookingCode: refund.bookingCode,
      reason: refund.reason,
      requestedAt: refund.requestedAt,
      guestName: booking ? guestName(booking) : refund.bookingCode,
      email: booking?.email ?? "",
      eventName: hangout?.name ?? booking?.eventSlug ?? "",
      amountPence: booking?.amountPence ?? null,
      checkedIn: Boolean(booking?.checkedInAt),
      paymentStatus: booking?.paymentStatus ?? "unpaid",
    };
  });

  const rows: BookingRow[] = bookings.map((booking) => {
    const hangout = bySlug.get(booking.eventSlug);
    return {
      code: booking.code,
      firstName: booking.firstName,
      lastName: booking.lastName,
      email: booking.email,
      eventSlug: booking.eventSlug,
      eventName: hangout?.name ?? booking.eventSlug,
      adults: booking.adults,
      children: booking.children,
      createdAt: booking.createdAt,
      paymentStatus: booking.paymentStatus,
      pricingChoice: booking.pricingChoice,
      amountPence: booking.amountPence,
      checkedInAt: booking.checkedInAt,
      isFree: hangout?.isFree ?? booking.paymentStatus === "free",
      pricePence: hangout?.pricePence ?? null,
      familyPricePence: hangout?.familyPricePence ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="admin-page-title">Reservations</h2>
          <p className="mt-1 text-sm text-ink/55">Who is enrolled, what they booked, and payment status.</p>
        </div>
        <Link href="/admin/check-in" className="admin-chip">
          Open check-in
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="admin-card admin-metric">
          <div className="flex items-start justify-between">
            <div>
              <p className="admin-metric-label">Enrolments</p>
              <p className="admin-metric-value">{bookings.length}</p>
            </div>
            <span className="admin-metric-icon bg-burgundy/10 text-burgundy">◎</span>
          </div>
          <p className="mt-2 text-xs text-ink/45">{seats} seats reserved</p>
        </article>
        <article className="admin-card admin-metric">
          <div className="flex items-start justify-between">
            <div>
              <p className="admin-metric-label">Paid</p>
              <p className="admin-metric-value">{paid}</p>
            </div>
            <span className="admin-metric-icon bg-[color-mix(in_srgb,#1f7a4d_14%,white)] text-[#1f7a4d]">£</span>
          </div>
          <p className="mt-2 text-xs text-ink/45">{paidRevenue ? formatGbp(paidRevenue) : "No payments yet"}</p>
        </article>
        <article className="admin-card admin-metric">
          <div className="flex items-start justify-between">
            <div>
              <p className="admin-metric-label">Awaiting payment</p>
              <p className="admin-metric-value">{unpaid}</p>
            </div>
            <span className="admin-metric-icon bg-gold/25 text-[#8a5a12]">…</span>
          </div>
          <p className="mt-2 text-xs text-ink/45">Unpaid or link sent</p>
        </article>
        <article className="admin-card admin-metric">
          <div className="flex items-start justify-between">
            <div>
              <p className="admin-metric-label">Checked in</p>
              <p className="admin-metric-value">{checkedIn}</p>
            </div>
            <span className="admin-metric-icon bg-pink/40 text-burgundy">✓</span>
          </div>
          <p className="mt-2 text-xs text-ink/45">
            {bookings.length ? Math.round((checkedIn / bookings.length) * 100) : 0}% of enrolments
          </p>
        </article>
      </div>

      {error ? <p className="rounded-2xl bg-pink/40 px-4 py-3 text-sm">{error}</p> : null}

      <ReservationsRefundProvider pending={pendingItems}>
        <ReservationsTable
          bookings={rows}
          carts={carts}
          pendingCodes={pendingItems.map((item) => item.bookingCode)}
          empty={!error && bookings.length === 0}
        />
      </ReservationsRefundProvider>

      <section className="admin-banner flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-lg font-semibold">Ready for the door?</p>
          <p className="mt-1 text-sm text-white/80">Check guests in with a booking code when they arrive.</p>
        </div>
        <Link href="/admin/check-in" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-burgundy">
          Open check-in
        </Link>
      </section>
    </div>
  );
}
