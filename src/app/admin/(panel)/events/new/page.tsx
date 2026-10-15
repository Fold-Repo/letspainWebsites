import { EventForm, type EventFormValues } from "@/components/EventForm";

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
};

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <p className="text-xs tracking-[0.18em] text-burgundy uppercase">Back office</p>
      <h1 className="mt-2 font-display text-5xl">New event</h1>
      <div className="mt-8 rounded-[1.4rem] bg-white p-5 sm:p-8">
        <EventForm mode="create" initial={blank} />
      </div>
    </div>
  );
}
