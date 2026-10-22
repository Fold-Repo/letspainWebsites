"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { EventCover } from "@/components/EventCover";
import { enrollmentState, formatLondon, type Hangout } from "@/lib/hangout";

function statusCopy(hangout: Hangout) {
  const state = enrollmentState(hangout);
  if (state === "open") return `Enrolment open until ${formatLondon(hangout.enrollmentEndsAt)}`;
  if (state === "upcoming") return `Enrolment opens ${formatLondon(hangout.enrollmentStartsAt)}`;
  return `Enrolment closed ${formatLondon(hangout.enrollmentEndsAt)}`;
}

export function UpcomingEventsCarousel({ events }: { events: Hangout[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = events.length;

  const scrollTo = useCallback((next: number) => {
    const track = trackRef.current;
    if (!track || count === 0) return;
    const clamped = ((next % count) + count) % count;
    const card = track.children[clamped] as HTMLElement | undefined;
    if (!card) return;
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: "smooth" });
    setIndex(clamped);
  }, [count]);

  useEffect(() => {
    if (count <= 1) return;
    const id = window.setInterval(() => scrollTo(index + 1), 6000);
    return () => window.clearInterval(id);
  }, [count, index, scrollTo]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const cards = Array.from(track.children) as HTMLElement[];
      if (cards.length === 0) return;
      const left = track.scrollLeft;
      let closest = 0;
      let best = Number.POSITIVE_INFINITY;
      cards.forEach((card, i) => {
        const distance = Math.abs(card.offsetLeft - track.offsetLeft - left);
        if (distance < best) {
          best = distance;
          closest = i;
        }
      });
      setIndex(closest);
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  if (count === 0) {
    return (
      <section className="relative overflow-hidden border-y border-burgundy/10 bg-burgundy text-cream">
        <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden>
          <div className="absolute -top-20 right-0 h-64 w-64 rounded-full bg-pink/40 blur-3xl" />
          <div className="absolute bottom-0 left-10 h-48 w-48 rounded-full bg-gold/30 blur-3xl" />
        </div>
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-14 md:flex-row md:items-center md:justify-between md:py-16">
          <div className="max-w-xl">
            <p className="text-[0.7rem] font-medium tracking-[0.22em] text-pink uppercase">Hangouts</p>
            <h2 className="mt-3 font-display text-4xl leading-tight md:text-5xl">Your next painting day starts here</h2>
            <p className="mt-3 text-cream/80">
              New hangouts will appear here as soon as enrolment opens. Browse the full list anytime.
            </p>
          </div>
          <Link href="/events" className="landing-btn bg-cream text-burgundy hover:bg-white">
            See all hangouts
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden border-y border-burgundy/10 bg-burgundy text-cream">
      <div className="pointer-events-none absolute inset-0 opacity-35" aria-hidden>
        <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-pink/45 blur-3xl" />
        <div className="absolute bottom-0 -left-10 h-56 w-56 rounded-full bg-gold/35 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pt-12 pb-6 md:pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-[0.7rem] font-medium tracking-[0.22em] text-pink uppercase">Upcoming hangouts</p>
            <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight md:text-5xl">
              Book the day you paint together
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-cream/80">
              These are the hangouts open for enrolment — or about to open. Pick a date, choose Adult, Child or Family
              tickets, and hold your places.
            </p>
          </div>
          <Link href="/events" className="landing-btn bg-cream text-burgundy hover:bg-white">
            See all hangouts
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-12 md:pb-16">
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Upcoming hangouts"
        >
          {events.map((hangout) => (
            <article
              key={hangout.slug}
              className="w-[min(100%,20rem)] shrink-0 snap-start overflow-hidden rounded-[1.4rem] bg-cream text-ink shadow-[0_20px_50px_rgba(0,0,0,0.18)] sm:w-[22rem]"
            >
              <EventCover event={hangout} className="aspect-[16/10]" sizes="352px" />
              <div className="p-5">
                <p className="text-[0.65rem] font-medium tracking-[0.18em] text-burgundy uppercase">
                  {hangout.city || "Hangout"} · {hangout.whenLabel || "Date TBC"}
                </p>
                <h3 className="mt-2 font-display text-2xl leading-tight">{hangout.name}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-ink/70">{hangout.summary || hangout.tagline}</p>
                <p className="mt-3 text-xs text-ink/55">{statusCopy(hangout)}</p>
                <Link
                  href={`/events/${hangout.slug}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-burgundy"
                >
                  View hangout <span aria-hidden>→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous hangout"
              onClick={() => scrollTo(index - 1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-cream/30 text-cream transition hover:bg-cream/10"
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Next hangout"
              onClick={() => scrollTo(index + 1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-cream/30 text-cream transition hover:bg-cream/10"
            >
              →
            </button>
          </div>
          <div className="flex gap-2" aria-hidden>
            {events.map((hangout, i) => (
              <button
                key={hangout.slug}
                type="button"
                onClick={() => scrollTo(i)}
                className={`h-2.5 rounded-full transition-all ${i === index ? "w-7 bg-cream" : "w-2.5 bg-cream/35"}`}
                aria-label={`Go to ${hangout.name}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
