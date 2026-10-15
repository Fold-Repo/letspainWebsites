import { notFound } from "next/navigation";
import { EventForm, type EventFormValues } from "@/components/EventForm";
import { getEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

function pounds(pence: number | null) {
  if (pence == null) return "";
  return (pence / 100).toFixed(2);
}

export default async function EditEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hangout = await getEvent(slug);
  if (!hangout) notFound();
  const initial: EventFormValues = {
    slug: hangout.slug,
    name: hangout.name,
    tagline: hangout.tagline,
    summary: hangout.summary,
    city: hangout.city,
    venue: hangout.venue,
    whenLabel: hangout.whenLabel,
    timeLabel: hangout.timeLabel,
    story: hangout.story,
    inclusions: hangout.inclusions.join("\n"),
    capacity: String(hangout.capacity),
    enrollmentStartsAt: hangout.enrollmentStartsAt,
    enrollmentEndsAt: hangout.enrollmentEndsAt,
    isFree: hangout.isFree,
    pricePerPerson: pounds(hangout.pricePence),
    familyPrice: pounds(hangout.familyPricePence),
    paymentTiming: hangout.paymentTiming,
    published: hangout.published,
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <p className="text-xs tracking-[0.18em] text-burgundy uppercase">Back office</p>
      <h1 className="mt-2 font-display text-5xl">{hangout.name}</h1>
      {!hangout.isFree && hangout.pricePence == null ? (
        <p className="mt-4 rounded-2xl bg-pink/40 px-4 py-3 text-sm">
          This event is marked paid, and the amount is still blank. Set the price per person before anyone is charged.
        </p>
      ) : null}
      <div className="mt-8 rounded-[1.4rem] bg-white p-5 sm:p-8">
        <EventForm mode="edit" initial={initial} />
      </div>
    </div>
  );
}
