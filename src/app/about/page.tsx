import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-14">
      <p className="text-xs tracking-[0.18em] text-burgundy uppercase">The brand</p>
      <h1 className="mt-3 font-display text-5xl">Make room for creativity, connection and fun.</h1>
      <div className="mt-6 space-y-4 text-lg leading-relaxed text-ink/80">
        <p>
          Let&apos;s All Paints is a home for creative painting experiences and social events. The
          first planned hangout is Eat, Drink &amp; Paint in Leicester, in May 2027.
        </p>
        <p>
          The idea is simple. You do not arrive as an artist. You sit with people you like, follow a
          guide, eat, drink if you want to, and leave with something you made. The room should feel
          welcoming, organised, and easy for beginners.
        </p>
        <p>
          Families, friendship groups and couples are all part of the plan. Age rules will be clear
          once the venue is confirmed. Non-alcoholic drinks are part of the offer, and nobody needs
          alcohol to join in.
        </p>
        <p>
          Later hangouts can include private parties and group bookings. This first one is about
          getting the day right.
        </p>
      </div>
    </article>
  );
}
