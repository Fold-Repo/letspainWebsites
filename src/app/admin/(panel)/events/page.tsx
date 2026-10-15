import Link from "next/link";
import { formatLondon, listEvents } from "@/lib/events";
import { formatGbp } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  let events: Awaited<ReturnType<typeof listEvents>> = [];
  let error = "";
  try {
    events = await listEvents();
  } catch {
    error = "Postgres is not reachable. Start the database, then refresh.";
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.18em] text-burgundy uppercase">Back office</p>
          <h1 className="mt-2 font-display text-5xl">Events</h1>
        </div>
        <Link href="/admin/events/new" className="rounded-full bg-burgundy px-4 py-2 text-sm text-cream">
          New event
        </Link>
      </div>
      {error ? <p className="mt-6 rounded-2xl bg-pink/40 px-4 py-3">{error}</p> : null}
      <div className="mt-8 space-y-4">
        {events.map((hangout) => (
          <article key={hangout.slug} className="rounded-[1.4rem] bg-white p-5">
            <p className="text-xs tracking-[0.14em] text-burgundy uppercase">
              {hangout.published ? "Published" : "Hidden"} · {hangout.isFree ? "Free" : "Paid"} ·{" "}
              {hangout.isFree ? "No payment" : hangout.paymentTiming === "now" ? "Pay after enrolment" : "Payment link later"}
            </p>
            <h2 className="mt-2 font-display text-3xl">{hangout.name}</h2>
            <p className="mt-1 text-sm text-ink/70">
              {hangout.city} · {hangout.whenLabel}
            </p>
            <p className="mt-2 text-sm">
              Enrolment {formatLondon(hangout.enrollmentStartsAt)} to {formatLondon(hangout.enrollmentEndsAt)}
            </p>
            <p className="mt-1 text-sm">
              {hangout.isFree
                ? "Free"
                : hangout.pricePence
                  ? `${formatGbp(hangout.pricePence)} per person`
                  : "Price not set"}
              {hangout.familyPricePence ? ` · family or group ${formatGbp(hangout.familyPricePence)}` : ""}
              {` · ${hangout.capacity} places`}
            </p>
            <Link href={`/admin/events/${hangout.slug}`} className="mt-4 inline-block text-sm text-burgundy">
              Edit event
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
