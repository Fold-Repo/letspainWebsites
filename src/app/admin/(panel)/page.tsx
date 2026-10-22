import Link from "next/link";
import { PaymentLinkForm } from "@/components/PaymentLinkForm";
import { requirePageCapability } from "@/lib/admin-session";
import { bookingCart, listBookings, partySize, type Booking } from "@/lib/bookings";
import { listEvents, type Hangout } from "@/lib/events";
import { formatGbp } from "@/lib/money";

export const dynamic = "force-dynamic";

function statusLabel(booking: Booking) {
  if (booking.checkedInAt) return "Checked in";
  if (booking.paymentStatus === "paid") return "Paid";
  if (booking.paymentStatus === "free") return "Free";
  if (booking.paymentStatus === "link_sent") return "Link sent";
  return "Unpaid";
}

function statusBadge(booking: Booking) {
  if (booking.checkedInAt) return "admin-badge admin-badge-in";
  if (booking.paymentStatus === "paid") return "admin-badge admin-badge-paid";
  if (booking.paymentStatus === "free") return "admin-badge admin-badge-free";
  if (booking.paymentStatus === "link_sent") return "admin-badge admin-badge-link";
  return "admin-badge admin-badge-unpaid";
}

export default async function AdminBookingsPage() {
  await requirePageCapability("bookings");

  let bookings: Booking[] = [];
  let events: Hangout[] = [];
  let error = "";
  try {
    [bookings, events] = await Promise.all([listBookings(), listEvents()]);
  } catch {
    error = "Postgres is not reachable. Start the database, then refresh.";
  }
  const bySlug = new Map(events.map((hangout) => [hangout.slug, hangout]));
  const carts = await Promise.all(
    bookings.map(async (booking) => {
      try {
        const items = await bookingCart(booking.code);
        const total = items.reduce((sum, item) => sum + item.unitPricePence * item.quantity, 0);
        return { code: booking.code, items, total: items.length > 0 ? total : (null as number | null) };
      } catch {
        return { code: booking.code, items: [], total: null as number | null };
      }
    }),
  );
  const cartByCode = new Map(carts.map((cart) => [cart.code, cart]));
  const seats = bookings.reduce((sum, booking) => sum + partySize(booking), 0);
  const paid = bookings.filter((booking) => booking.paymentStatus === "paid").length;
  const unpaid = bookings.filter(
    (booking) => booking.paymentStatus === "unpaid" || booking.paymentStatus === "link_sent",
  ).length;
  const checkedIn = bookings.filter((booking) => booking.checkedInAt).length;
  const paidRevenue = bookings
    .filter((booking) => booking.paymentStatus === "paid")
    .reduce((sum, booking) => sum + (booking.amountPence ?? 0), 0);

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

      <section className="admin-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-burgundy/10 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-ink">Recent enrolments</h3>
            <p className="text-sm text-ink/50">Send payment links from the row actions.</p>
          </div>
        </div>
        {!error && bookings.length === 0 ? (
          <p className="px-5 py-10 text-sm text-ink/60">No enrolments yet.</p>
        ) : (
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
                  const hangout = bySlug.get(booking.eventSlug);
                  const cart = cartByCode.get(booking.code);
                  return (
                    <tr key={booking.code}>
                      <td>
                        <p className="font-semibold text-ink">
                          {booking.firstName} {booking.lastName}
                        </p>
                        <p className="text-xs text-ink/50">{booking.email}</p>
                        <p className="mt-1 text-[11px] tracking-wide text-burgundy/70 uppercase">{booking.code}</p>
                      </td>
                      <td>
                        <p className="font-medium text-ink">{hangout?.name ?? booking.eventSlug}</p>
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
                        <span className={statusBadge(booking)}>{statusLabel(booking)}</span>
                        <p className="mt-1 text-[11px] text-ink/45">
                          {new Date(booking.createdAt).toLocaleDateString("en-GB")}
                        </p>
                      </td>
                      <td className="font-semibold text-ink">
                        {booking.amountPence ? formatGbp(booking.amountPence) : "—"}
                      </td>
                      <td className="min-w-[14rem]">
                        <PaymentLinkForm
                          code={booking.code}
                          paid={booking.paymentStatus === "paid"}
                          isFree={hangout?.isFree ?? booking.paymentStatus === "free"}
                          pricePence={hangout?.pricePence ?? null}
                          familyPricePence={hangout?.familyPricePence ?? null}
                          seats={partySize(booking)}
                          pricingChoice={booking.pricingChoice}
                          cartTotalPence={cart?.total ?? booking.amountPence}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
