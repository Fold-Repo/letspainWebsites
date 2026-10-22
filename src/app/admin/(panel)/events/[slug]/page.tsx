import { notFound } from "next/navigation";
import { EventForm, type EventFormValues } from "@/components/EventForm";
import { TicketCategoriesAdmin } from "@/components/TicketCategoriesAdmin";
import { requirePageCapability } from "@/lib/admin-session";
import { getEvent } from "@/lib/events";
import { listCategories } from "@/lib/ticket-categories";

export const dynamic = "force-dynamic";

function pounds(pence: number | null) {
  if (pence == null) return "";
  return (pence / 100).toFixed(2);
}

export default async function EditEventPage({ params }: { params: Promise<{ slug: string }> }) {
  await requirePageCapability("events");
  const { slug } = await params;
  const hangout = await getEvent(slug);
  if (!hangout) notFound();
  const categories = await listCategories(slug);
  const initial: EventFormValues = {
    slug: hangout.slug,
    name: hangout.name,
    tagline: hangout.tagline,
    summary: hangout.summary,
    city: hangout.city,
    venue: hangout.venue,
    whenLabel: hangout.whenLabel,
    timeLabel: hangout.timeLabel,
    eventDate: hangout.eventDate,
    eventTime: hangout.eventTime,
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
    imageUrl: hangout.imageUrl,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="admin-page-title">{hangout.name}</h2>
        <p className="mt-1 text-sm text-ink/55">Event details and ticket categories.</p>
      </div>
      {!hangout.isFree && hangout.pricePence == null && categories.length === 0 ? (
        <p className="rounded-2xl bg-pink/40 px-4 py-3 text-sm">
          Add ticket categories below, or set a fallback price per person, before anyone is charged.
        </p>
      ) : null}
      <div className="admin-card p-5 sm:p-8">
        <EventForm mode="edit" initial={initial} />
        <TicketCategoriesAdmin slug={slug} initial={categories} />
      </div>
    </div>
  );
}
