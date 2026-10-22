import type { Metadata } from "next";
import Link from "next/link";
import { EventCover } from "@/components/EventCover";
import { formatLondon, isEnrollmentOpen, listPublishedEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hangouts",
  description: "Painting hangouts from Let's All Paints.",
};

export default async function EventsPage() {
  const events = await listPublishedEvents().catch(() => []);
  return (
    <div className="mx-auto max-w-5xl px-5 py-14">
      <p className="text-xs tracking-[0.18em] text-burgundy uppercase">What is on</p>
      <h1 className="mt-3 font-display text-5xl">Hangouts</h1>
      {events.length === 0 ? <p className="mt-6 text-ink/70">No hangouts are published yet.</p> : null}
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {events.map((hangout) => (
          <article key={hangout.slug} className="overflow-hidden rounded-[1.4rem] bg-white shadow-sm">
            <EventCover event={hangout} className="aspect-[16/10]" sizes="(max-width: 640px) 100vw, 420px" />
            <div className="p-5">
              <p className="text-xs tracking-[0.14em] text-burgundy uppercase">
                {hangout.city} · {hangout.whenLabel}
              </p>
              <h2 className="mt-2 font-display text-3xl">{hangout.name}</h2>
              <p className="mt-2 text-ink/75">{hangout.summary}</p>
              <p className="mt-2 text-sm text-ink/60">
                {isEnrollmentOpen(hangout)
                  ? `Enrolment open until ${formatLondon(hangout.enrollmentEndsAt)}`
                  : `Enrolment ${formatLondon(hangout.enrollmentStartsAt)} to ${formatLondon(hangout.enrollmentEndsAt)}`}
              </p>
              <Link href={`/events/${hangout.slug}`} className="mt-4 inline-block text-burgundy">
                See this hangout
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
