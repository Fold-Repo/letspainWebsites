import type { Metadata } from "next";
import { BookingForm } from "@/components/BookingForm";
import { formatLondon, isEnrollmentOpen, listPublishedEvents } from "@/lib/events";
import { listCategories, remainingSeats } from "@/lib/ticket-categories";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Enrol",
  description: "Enrol for a Let's All Paints hangout and receive a ticket by email.",
};

export default async function BookPage() {
  const published = (await listPublishedEvents().catch(() => [])).filter((hangout) => isEnrollmentOpen(hangout));
  const events = await Promise.all(
    published.map(async (hangout) => {
      const remaining = await remainingSeats(hangout.slug, hangout.capacity);
      const tickets = await listCategories(hangout.slug, true);
      return {
        slug: hangout.slug,
        name: hangout.name,
        isFree: hangout.isFree,
        pricePence: hangout.pricePence,
        familyPricePence: hangout.familyPricePence,
        paymentTiming: hangout.paymentTiming,
        enrollmentEndsAt: hangout.enrollmentEndsAt,
        remainingSeats: remaining,
        soldOut: remaining <= 0,
        tickets: tickets.map((ticket) => ({
          id: ticket.id,
          name: ticket.name,
          description: ticket.description,
          kind: ticket.kind,
          pricePence: ticket.pricePence,
          seatsPerTicket: ticket.seatsPerTicket,
          maxPerOrder: ticket.maxPerOrder,
        })),
        city: hangout.city,
        whenLabel: hangout.whenLabel,
        venue: hangout.venue,
        timeLabel: hangout.timeLabel,
      };
    }),
  );
  const first = events[0];

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr]">
      <aside>
        <p className="text-xs tracking-[0.18em] text-burgundy uppercase">Enrolment</p>
        <h1 className="mt-3 font-display text-5xl leading-[0.95]">Hold your places</h1>
        {first ? (
          <>
            <p className="mt-4 leading-relaxed text-ink/75">
              Choose tickets for {events.length === 1 ? first.name : "a hangout"}, then tell us who is leading the
              party. We email a QR ticket for the door. Stripe takes any card payment.
            </p>
            {events.length === 1 ? (
              <ul className="mt-6 space-y-2 text-sm text-ink/80">
                <li>{first.city}</li>
                <li>{first.whenLabel}</li>
                <li>{first.venue}</li>
                <li>{first.timeLabel}</li>
                <li>Enrolment closes {formatLondon(first.enrollmentEndsAt)}</li>
                <li>
                  {first.soldOut ? "Sold out" : `${first.remainingSeats} place${first.remainingSeats === 1 ? "" : "s"} left`}
                </li>
              </ul>
            ) : null}
          </>
        ) : (
          <p className="mt-4 leading-relaxed text-ink/75">Enrolment is not open for any hangout right now.</p>
        )}
      </aside>
      <section className="rounded-[1.6rem] bg-white p-5 shadow-sm sm:p-8">
        {events.length > 0 ? <BookingForm events={events} /> : <p className="text-ink/70">Check back when a hangout opens for enrolment.</p>}
      </section>
    </div>
  );
}
