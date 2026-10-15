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
        return { code: booking.code, items, total: items.length > 0 ? total : null as number | null };
      } catch {
        return { code: booking.code, items: [], total: null as number | null };
      }
    }),
  );
  const cartByCode = new Map(carts.map((cart) => [cart.code, cart]));
  const seats = bookings.reduce((sum, booking) => sum + partySize(booking), 0);
  const paid = bookings.filter((booking) => booking.paymentStatus === "paid").length;
  const checkedIn = bookings.filter((booking) => booking.checkedInAt).length;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <p className="text-xs tracking-[0.18em] text-burgundy uppercase">Reservations</p>
      <h1 className="mt-2 font-display text-5xl">Who is coming</h1>
      <p className="mt-3 text-ink/70">
        {bookings.length} {bookings.length === 1 ? "enrolment" : "enrolments"} · {seats} seats · {paid} paid ·{" "}
        {checkedIn} checked in
      </p>
      {error ? <p className="mt-6 rounded-2xl bg-pink/40 px-4 py-3">{error}</p> : null}
      {!error && bookings.length === 0 ? <p className="mt-8 text-ink/70">No enrolments yet.</p> : null}
      <div className="mt-8 space-y-4">
        {bookings.map((booking) => {
          const hangout = bySlug.get(booking.eventSlug);
          const cart = cartByCode.get(booking.code);
          return (
            <article key={booking.code} className="grid gap-4 rounded-[1.4rem] bg-white p-5 md:grid-cols-[1.3fr_0.7fr]">
              <div>
                <p className="text-xs tracking-[0.14em] text-burgundy uppercase">
                  {booking.code} · {statusLabel(booking)}
                  {booking.amountPence ? ` · ${formatGbp(booking.amountPence)}` : ""}
                </p>
                <h2 className="mt-2 font-display text-3xl">
                  {booking.firstName} {booking.lastName}
                </h2>
                <p className="mt-1 text-sm text-ink/80">{booking.email}</p>
                <p className="mt-2 text-sm">{hangout?.name ?? booking.eventSlug}</p>
                <p className="mt-2 text-sm">
                  {booking.adults} {booking.adults === 1 ? "adult" : "adults"}
                  {booking.children > 0
                    ? `, ${booking.children} ${booking.children === 1 ? "child" : "children"}`
                    : ""}
                  {booking.phone ? ` · ${booking.phone}` : ""}
                </p>
                {cart && cart.items.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm text-ink/70">
                    {cart.items.map((item) => (
                      <li key={item.id}>
                        {item.quantity} × {item.categoryName}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {booking.notes ? <p className="mt-2 text-sm text-ink/70">{booking.notes}</p> : null}
                <p className="mt-2 text-xs text-ink/50">
                  Enrolled {new Date(booking.createdAt).toLocaleString("en-GB")} · voucher {booking.emailStatus}
                  {booking.checkedInAt
                    ? ` · in at ${new Date(booking.checkedInAt).toLocaleString("en-GB")}`
                    : ""}
                </p>
                {booking.checkoutUrl && booking.paymentStatus !== "paid" ? (
                  <p className="mt-2 break-all text-xs">
                    Latest link:{" "}
                    <a className="text-burgundy" href={booking.checkoutUrl}>
                      {booking.checkoutUrl}
                    </a>
                  </p>
                ) : null}
              </div>
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
            </article>
          );
        })}
      </div>
    </div>
  );
}
