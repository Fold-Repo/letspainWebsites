import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventCover } from "@/components/EventCover";
import { formatLondon, getEvent, isEnrollmentOpen, storyParagraphs } from "@/lib/events";
import { hasCustomCover } from "@/lib/hangout";
import { formatGbp } from "@/lib/money";
import { pickSceneBackground } from "@/lib/scene-backgrounds";
import { listCategories, remainingSeats } from "@/lib/ticket-categories";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const hangout = await getEvent(slug).catch(() => null);
  if (!hangout) return { title: "Hangout" };
  return { title: hangout.name, description: hangout.summary };
}

export default async function EventPage({ params }: Params) {
  const { slug } = await params;
  const hangout = await getEvent(slug);
  if (!hangout || !hangout.published) notFound();
  const open = isEnrollmentOpen(hangout);
  const remaining = await remainingSeats(hangout.slug, hangout.capacity);
  const soldOut = remaining <= 0;
  const canEnrol = open && !soldOut;
  const tickets = await listCategories(hangout.slug, true);
  const story = storyParagraphs(hangout.story);
  const heroSrc = hasCustomCover(hangout) ? undefined : pickSceneBackground();

  const enrolStatus = soldOut
    ? "Sold out"
    : open
      ? `Open · ${remaining} place${remaining === 1 ? "" : "s"} left`
      : "Enrolment closed";

  const enrolDetail = soldOut
    ? "This hangout has no places left."
    : open
      ? `Enrol until ${formatLondon(hangout.enrollmentEndsAt)}`
      : `Closed ${formatLondon(hangout.enrollmentEndsAt)}`;

  const payCopy = hangout.isFree
    ? "Free to attend — no payment required."
    : tickets.length > 0
      ? hangout.paymentTiming === "now"
        ? "Pay securely on Stripe right after you enrol."
        : "Enrol first — we email a Stripe payment link afterwards."
      : hangout.pricePence == null
        ? "Price not published yet. Enrolment does not take payment."
        : hangout.paymentTiming === "now"
          ? `${formatGbp(hangout.pricePence)} per person, paid on Stripe after enrolment.`
          : `${formatGbp(hangout.pricePence)} per person. Enrol first; payment link follows by email.`;

  const whenLine = [hangout.whenLabel, hangout.timeLabel].filter(Boolean).join(" · ");
  const whereLine = [hangout.venue, hangout.city].filter(Boolean).join(", ");

  return (
    <article className="event-detail bg-cream text-ink">
      <section className="event-hero relative isolate h-[13.5rem] overflow-hidden text-cream sm:h-[16.5rem] md:h-[19rem]">
        <EventCover
          event={hangout}
          src={heroSrc}
          className="absolute inset-0 h-full w-full rounded-none"
          sizes="100vw"
          priority
        />
        <div className="event-hero-veil absolute inset-0" aria-hidden />
        <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-end px-4 pb-5 pt-14 sm:px-5 sm:pb-7 sm:pt-16 md:pb-8">
          <Link
            href="/events"
            className="event-fade-up mb-3 inline-flex w-fit items-center gap-2 text-[0.65rem] font-semibold tracking-[0.18em] text-cream/75 uppercase transition hover:text-cream sm:mb-4"
          >
            <span aria-hidden>←</span> All hangouts
          </Link>
          <p className="event-fade-up text-[0.65rem] font-medium tracking-[0.2em] text-pink uppercase">
            {hangout.city}
            {hangout.whenLabel ? ` · ${hangout.whenLabel}` : ""}
          </p>
          <h1 className="event-fade-up-delay mt-2 max-w-3xl font-display text-[clamp(1.85rem,6.5vw,3.25rem)] leading-[0.95] tracking-tight">
            {hangout.name}
          </h1>
          {(hangout.tagline || hangout.summary) && (
            <p className="event-fade-up-late mt-2 max-w-xl text-sm leading-snug text-cream/85 line-clamp-2 sm:mt-3 sm:text-base sm:line-clamp-none">
              {hangout.tagline || hangout.summary}
            </p>
          )}
        </div>
      </section>

      <section className="border-b border-burgundy/10 bg-white">
        <div className="mx-auto grid max-w-6xl gap-0 px-4 sm:grid-cols-3 sm:px-5">
          {[
            { label: "When", value: whenLine || "Date to be confirmed" },
            { label: "Where", value: whereLine || "Venue to be confirmed" },
            { label: "Places", value: soldOut ? "Sold out" : `${remaining} of ${hangout.capacity} left` },
          ].map((fact, index) => (
            <div
              key={fact.label}
              className={`event-fact py-4 sm:py-6 ${index > 0 ? "border-t border-burgundy/10 sm:border-t-0 sm:border-l sm:pl-6 md:pl-8" : ""} ${index < 2 ? "sm:pr-6 md:pr-8" : ""}`}
              style={{ animationDelay: `${0.08 + index * 0.06}s` }}
            >
              <p className="text-[0.65rem] font-medium tracking-[0.2em] text-burgundy uppercase">{fact.label}</p>
              <p className="mt-1.5 font-display text-lg leading-snug sm:mt-2 sm:text-xl md:text-2xl">{fact.value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:gap-6 sm:px-5 sm:py-10 md:py-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)] lg:items-start lg:gap-8">
        <div className="event-detail-card order-2 min-w-0 rounded-[1.35rem] bg-white p-5 shadow-[0_12px_40px_rgba(40,33,42,0.06)] sm:rounded-[1.6rem] sm:p-7 md:p-8 lg:order-1">
          <div className="space-y-10 sm:space-y-12">
            <section>
              <p className="text-[0.7rem] font-medium tracking-[0.2em] text-burgundy uppercase">The hangout</p>
              <h2 className="mt-2 font-display text-3xl tracking-tight sm:mt-3 sm:text-4xl md:text-5xl">
                What the day is about
              </h2>
              {hangout.summary ? (
                <p className="mt-4 text-base leading-relaxed text-ink/75 sm:mt-5 sm:text-lg">{hangout.summary}</p>
              ) : null}
              {story.length > 0 ? (
                <div className="mt-5 space-y-4 text-sm leading-relaxed text-ink/80 sm:mt-6 sm:text-base">
                  {story.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              ) : null}
            </section>

            {hangout.inclusions.length > 0 ? (
              <section>
                <p className="text-[0.7rem] font-medium tracking-[0.2em] text-burgundy uppercase">Included</p>
                <h2 className="mt-2 font-display text-3xl tracking-tight sm:mt-3 sm:text-4xl">Planned for the table</h2>
                <ul className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2">
                  {hangout.inclusions.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 border-t border-burgundy/12 pt-3 text-sm leading-relaxed text-ink/80 sm:pt-4"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-burgundy" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {tickets.length > 0 ? (
              <section>
                <p className="text-[0.7rem] font-medium tracking-[0.2em] text-burgundy uppercase">Pricing</p>
                <h2 className="mt-2 font-display text-3xl tracking-tight sm:mt-3 sm:text-4xl">Tickets</h2>
                <p className="mt-2 text-sm text-ink/65 sm:mt-3 sm:text-base">{payCopy}</p>
                <ul className="mt-6 divide-y divide-burgundy/12 border-y border-burgundy/12 sm:mt-8">
                  {tickets.map((ticket) => (
                    <li
                      key={ticket.id}
                      className="event-ticket-row flex flex-col gap-1 py-4 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-3 sm:py-5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-xl leading-tight sm:text-2xl">{ticket.name}</p>
                        {ticket.description ? (
                          <p className="mt-1 max-w-md text-sm leading-relaxed text-ink/65 sm:mt-1.5">
                            {ticket.description}
                          </p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-sm font-semibold tracking-wide text-burgundy">
                        {ticket.pricePence === 0 ? "Free" : formatGbp(ticket.pricePence)}
                        {ticket.seatsPerTicket > 1 ? (
                          <span className="font-normal text-ink/50"> · {ticket.seatsPerTicket} seats</span>
                        ) : null}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>

        <aside className="order-1 lg:order-2 lg:sticky lg:top-6">
          <div className="event-aside relative overflow-hidden rounded-[1.35rem] bg-burgundy text-cream shadow-[0_20px_50px_rgba(75,24,50,0.22)] sm:rounded-[1.6rem]">
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-pink/35 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-36 w-36 rounded-full bg-gold/25 blur-3xl" aria-hidden />
            <div className="relative p-5 sm:p-6 md:p-7">
              <p className="text-[0.65rem] font-medium tracking-[0.2em] text-pink uppercase">Enrolment</p>
              <p className="mt-2 font-display text-2xl leading-tight sm:mt-3 sm:text-3xl">{enrolStatus}</p>
              <p className="mt-2 text-sm leading-relaxed text-cream/75">{enrolDetail}</p>
              <dl className="mt-5 space-y-3 border-t border-cream/15 pt-4 text-sm sm:mt-6 sm:space-y-4 sm:pt-5">
                <div>
                  <dt className="text-cream/55">When</dt>
                  <dd className="mt-1 text-cream/95">{whenLine || "TBC"}</dd>
                </div>
                <div>
                  <dt className="text-cream/55">Where</dt>
                  <dd className="mt-1 text-cream/95">{whereLine || "TBC"}</dd>
                </div>
                <div>
                  <dt className="text-cream/55">Payment</dt>
                  <dd className="mt-1 text-cream/95">{payCopy}</dd>
                </div>
              </dl>
              {canEnrol ? (
                <Link
                  href="/book"
                  className="landing-btn mt-6 w-full justify-center bg-cream text-burgundy hover:bg-white sm:mt-7"
                >
                  Enrol now
                  <span aria-hidden>→</span>
                </Link>
              ) : (
                <p className="mt-6 rounded-2xl border border-cream/20 bg-cream/5 px-4 py-3 text-sm text-cream/80 sm:mt-7">
                  {soldOut
                    ? "This hangout is sold out."
                    : "Enrolment for this hangout is not open yet."}
                </p>
              )}
              <Link
                href="/events"
                className="mt-3 block text-center text-xs font-semibold tracking-[0.14em] text-cream/60 uppercase transition hover:text-cream sm:mt-4"
              >
                Browse other hangouts
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}
