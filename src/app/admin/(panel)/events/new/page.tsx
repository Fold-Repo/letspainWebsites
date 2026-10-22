import { EventForm, type EventFormValues } from "@/components/EventForm";
import { requirePageCapability } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

const blank: EventFormValues = {
  slug: "",
  name: "",
  tagline: "",
  summary: "",
  city: "",
  venue: "",
  whenLabel: "",
  timeLabel: "",
  eventDate: "",
  eventTime: "",
  story: "",
  inclusions: "",
  capacity: "80",
  enrollmentStartsAt: new Date().toISOString(),
  enrollmentEndsAt: "",
  isFree: false,
  pricePerPerson: "",
  familyPrice: "",
  paymentTiming: "later",
  published: true,
  imageUrl: "",
};

export default async function NewEventPage() {
  await requirePageCapability("events");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="admin-page-title">New event</h2>
        <p className="mt-1 text-sm text-ink/55">Set Adult, Child and Family prices when the hangout is paid.</p>
      </div>
      <div className="admin-card p-5 sm:p-8">
        <EventForm mode="create" initial={blank} />
      </div>
    </div>
  );
}
