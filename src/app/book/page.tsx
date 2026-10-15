import type { Metadata } from "next";
import { BookingForm } from "@/components/BookingForm";
import { formatLondon, isEnrollmentOpen, listPublishedEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Enrol",
  description: "Enrol for a Let's All Paints hangout and receive a voucher by email.",
};

export default async function BookPage() {
  const events = (await listPublishedEvents().catch(() => [])).filter((hangout) => isEnrollmentOpen(hangout));
  const first = events[0];

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr]">
      <aside>
        <p className="text-xs tracking-[0.18em] text-burgundy uppercase">Enrolment</p>
        <h1 className="mt-3 font-display text-5xl leading-[0.95]">Hold your places</h1>
        {first ? (
          <>
            <p className="mt-4 leading-relaxed text-ink/75">
              Tell us who is coming to {events.length === 1 ? first.name : "a hangout"}. We email a voucher for the
              door. Payment follows the setting for that event.
            </p>
            {events.length === 1 ? (
              <ul className="mt-6 space-y-2 text-sm text-ink/80">
                <li>{first.city}</li>
                <li>{first.whenLabel}</li>
                <li>{first.venue}</li>
                <li>{first.timeLabel}</li>
                <li>Enrolment closes {formatLondon(first.enrollmentEndsAt)}</li>
              </ul>
            ) : null}
          </>
        ) : (
          <p className="mt-4 leading-relaxed text-ink/75">Enrolment is not open for any hangout right now.</p>
        )}
      </aside>
      <section className="rounded-[1.6rem] bg-white p-5 shadow-sm sm:p-8">
        {events.length > 0 ? (
          <BookingForm
            events={events.map((hangout) => ({
              slug: hangout.slug,
              name: hangout.name,
              isFree: hangout.isFree,
              pricePence: hangout.pricePence,
              familyPricePence: hangout.familyPricePence,
              paymentTiming: hangout.paymentTiming,
              enrollmentEndsAt: hangout.enrollmentEndsAt,
            }))}
          />
        ) : (
          <p className="text-ink/70">Check back when a hangout opens for enrolment.</p>
        )}
      </section>
    </div>
  );
}
