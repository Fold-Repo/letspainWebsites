import Image from "next/image";
import Link from "next/link";
import { getFeaturedEvent, storyParagraphs } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let featured: Awaited<ReturnType<typeof getFeaturedEvent>> = null;
  try {
    featured = await getFeaturedEvent();
  } catch {
    featured = null;
  }
  const story = featured ? storyParagraphs(featured.story) : [];

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 md:grid-cols-[1.1fr_0.9fr] md:py-20">
        <div>
          <p className="text-xs tracking-[0.22em] text-burgundy uppercase">
            {featured ? `${featured.city} · ${featured.whenLabel}` : "Let's All Paints"}
          </p>
          <h1 className="mt-4 font-display text-6xl leading-[0.9] text-ink md:text-7xl">
            {featured?.name ?? "Let's All Paints"}
          </h1>
          <p className="mt-5 max-w-xl font-display text-2xl text-burgundy">
            {featured?.tagline || "A creative day for everyone."}
          </p>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink/80">
            Creative moments. Great company. Lasting memories. A painting hangout for families,
            friends and anyone who wants a canvas at the end of the day.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/book" className="rounded-full bg-burgundy px-5 py-3 text-cream">
              Enrol
            </Link>
            <Link
              href={featured ? `/events/${featured.slug}` : "/events"}
              className="rounded-full border border-burgundy px-5 py-3 text-burgundy"
            >
              See the hangout
            </Link>
          </div>
        </div>
        <div className="overflow-hidden rounded-[2rem] bg-cream shadow-xl">
          <Image src="/logo.jpg" alt="Let's All Paint" width={900} height={900} priority className="h-auto w-full" />
        </div>
      </section>

      <section className="border-y border-burgundy/10 bg-white/50">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-3">
          {[
            ["01", "Create", "Paint together, with a guide and materials waiting on the table."],
            ["02", "Connect", "Make memories with family, friends or someone you have been meaning to see."],
            ["03", "Celebrate", "Good food, drinks, and a canvas you actually made."],
          ].map(([index, title, copy]) => (
            <article key={title}>
              <p className="font-display text-sm text-gold">{index}</p>
              <h2 className="mt-2 font-display text-3xl">{title}</h2>
              <p className="mt-2 text-ink/75">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      {featured ? (
        <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2">
          <div>
            <p className="text-xs tracking-[0.18em] text-burgundy uppercase">The hangout</p>
            <h2 className="mt-3 font-display text-4xl">What the day is for</h2>
            <div className="mt-5 space-y-4 leading-relaxed text-ink/80">
              {story.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
          <ul className="space-y-3 self-center">
            {featured.inclusions.map((item) => (
              <li key={item} className="rounded-2xl border border-burgundy/10 bg-white px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
