import Link from "next/link";
import { EventCover } from "@/components/EventCover";
import { requirePageCapability } from "@/lib/admin-session";
import { formatLondon, listEvents } from "@/lib/events";
import { formatGbp } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  await requirePageCapability("events");
  let events: Awaited<ReturnType<typeof listEvents>> = [];
  let error = "";
  try {
    events = await listEvents();
  } catch {
    error = "Postgres is not reachable. Start the database, then refresh.";
  }

  const published = events.filter((event) => event.published).length;
  const paidEvents = events.filter((event) => !event.isFree).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="admin-page-title">Events</h2>
          <p className="mt-1 text-sm text-ink/55">Hangouts, enrolment windows, and ticket categories.</p>
        </div>
        <Link href="/admin/events/new" className="admin-btn-primary">
          + New event
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="admin-card admin-metric">
          <p className="admin-metric-label">Total events</p>
          <p className="admin-metric-value">{events.length}</p>
        </article>
        <article className="admin-card admin-metric">
          <p className="admin-metric-label">Published</p>
          <p className="admin-metric-value">{published}</p>
        </article>
        <article className="admin-card admin-metric">
          <p className="admin-metric-label">Paid hangouts</p>
          <p className="admin-metric-value">{paidEvents}</p>
        </article>
      </div>

      {error ? <p className="rounded-2xl bg-pink/40 px-4 py-3 text-sm">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {events.map((hangout) => (
          <article key={hangout.slug} className="admin-card overflow-hidden">
            <EventCover event={hangout} className="aspect-[16/9]" sizes="(max-width: 1024px) 100vw, 420px" />
            <div className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={hangout.published ? "admin-badge admin-badge-paid" : "admin-badge admin-badge-free"}>
                {hangout.published ? "Published" : "Hidden"}
              </span>
              <span className={hangout.isFree ? "admin-badge admin-badge-free" : "admin-badge admin-badge-link"}>
                {hangout.isFree ? "Free" : "Paid"}
              </span>
            </div>
            <h3 className="mt-3 text-xl font-semibold text-ink">{hangout.name}</h3>
            <p className="mt-1 text-sm text-ink/60">
              {hangout.city}
              {hangout.whenLabel ? ` · ${hangout.whenLabel}` : ""}
            </p>
            <p className="mt-3 text-sm text-ink/70">
              Enrolment {formatLondon(hangout.enrollmentStartsAt)} → {formatLondon(hangout.enrollmentEndsAt)}
            </p>
            <p className="mt-1 text-sm text-ink/70">
              {hangout.isFree
                ? "Free entry"
                : hangout.pricePence
                  ? `${formatGbp(hangout.pricePence)} fallback / person`
                  : "Ticket categories"}
              {` · ${hangout.capacity} places`}
            </p>
            <Link
              href={`/admin/events/${hangout.slug}`}
              className="mt-4 inline-flex rounded-full border border-burgundy/20 px-4 py-2 text-sm font-semibold text-burgundy"
            >
              Edit event
            </Link>
            </div>
          </article>
        ))}
      </div>
      {!error && events.length === 0 ? (
        <div className="admin-card px-5 py-12 text-center">
          <p className="text-ink/60">No events yet.</p>
          <Link href="/admin/events/new" className="admin-btn-primary mt-4 inline-flex">
            Create the first event
          </Link>
        </div>
      ) : null}
    </div>
  );
}
