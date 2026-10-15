import Image from "next/image";
import Link from "next/link";
import { getFeaturedEvent, storyParagraphs } from "@/lib/events";

export const dynamic = "force-dynamic";

const programs = [
  {
    title: "Create",
    copy: "Paint together, with a guide and materials waiting on the table.",
    href: "/book",
    tone: "burgundy" as const,
  },
  {
    title: "Connect",
    copy: "Make memories with family, friends or someone you have been meaning to see.",
    href: "/about",
    tone: "gold" as const,
  },
  {
    title: "Celebrate",
    copy: "Good food, drinks, and a canvas you actually made.",
    href: "/events",
    tone: "pink" as const,
  },
];

export default async function HomePage() {
  let featured: Awaited<ReturnType<typeof getFeaturedEvent>> = null;
  try {
    featured = await getFeaturedEvent();
  } catch {
    featured = null;
  }
  const story = featured ? storyParagraphs(featured.story) : [];
  const eventHref = featured ? `/events/${featured.slug}` : "/events";
  const placeLine = featured
    ? `${featured.city} · ${featured.whenLabel}`
    : "Creative hangouts · Leicester first";

  return (
    <div className="landing bg-white text-ink">
      {/* Hero — brand + one line + CTA + diagonal image plane */}
      <section className="landing-hero relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 landing-wash" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pt-10 pb-16 md:grid-cols-[1.05fr_0.95fr] md:pt-16 md:pb-24">
          <div className="landing-fade-up relative z-10">
            <p className="text-[0.7rem] font-medium tracking-[0.22em] text-burgundy uppercase">
              {placeLine}
            </p>
            <h1 className="mt-5 font-display text-[clamp(2.75rem,7vw,4.75rem)] leading-[0.95] tracking-tight text-ink">
              Let&apos;s All Paints
            </h1>
            <p className="mt-5 max-w-md font-display text-2xl leading-snug text-burgundy md:text-[1.65rem]">
              {featured?.tagline || "A creative day for everyone."}
            </p>
            <p className="mt-4 max-w-md text-base leading-relaxed text-ink/70">
              Creative moments. Great company. Lasting memories. A painting hangout for families,
              friends and anyone who wants a canvas at the end of the day.
            </p>
            <div className="mt-8">
              <Link href="/book" className="landing-btn landing-btn-ink">
                Enrol
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          <div className="landing-fade-up-delay relative mx-auto w-full max-w-md md:max-w-none">
            <span className="landing-dot landing-dot-a" aria-hidden />
            <span className="landing-dot landing-dot-b" aria-hidden />
            <span className="landing-dot landing-dot-c" aria-hidden />
            <div className="landing-slash-stack" aria-hidden={false}>
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="landing-slash" style={{ ["--i" as string]: index }}>
                  <Image
                    src="/logo.jpg"
                    alt=""
                    width={900}
                    height={900}
                    priority={index === 0}
                    className="landing-slash-img"
                    style={{ objectPosition: `${12 + index * 18}% center` }}
                  />
                </div>
              ))}
            </div>
            <span className="sr-only">Let&apos;s All Paints brand mark</span>
          </div>
        </div>
      </section>

      {/* Three pillars */}
      <section className="border-t border-burgundy/8 bg-[#fbf8f4]">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl tracking-tight md:text-5xl">What the day holds</h2>
            <p className="mt-3 text-ink/65">
              {featured?.summary ||
                "Sit down with people you like, follow a guide, and leave with something you made."}
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {programs.map((program) => (
              <article
                key={program.title}
                className="group flex flex-col overflow-hidden rounded-[1.4rem] bg-white shadow-[0_18px_40px_rgba(40,33,42,0.06)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(117,41,77,0.12)]"
              >
                <div
                  className={`landing-card-media landing-card-media-${program.tone} relative aspect-[4/3] overflow-hidden`}
                >
                  <Image
                    src="/logo.jpg"
                    alt=""
                    width={640}
                    height={480}
                    className="h-full w-full object-cover opacity-90 transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col px-5 pt-5 pb-6">
                  <h3 className="font-display text-2xl">{program.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink/70">{program.copy}</p>
                  <Link href={program.href} className="landing-btn landing-btn-ink mt-5 self-start text-xs">
                    Learn more
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Centered welcome */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 landing-wash landing-wash-soft" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-5 py-20 text-center md:py-24">
          <p className="text-[0.7rem] font-medium tracking-[0.22em] text-gold uppercase">About us</p>
          <h2 className="mt-4 font-display text-4xl leading-tight tracking-tight md:text-5xl">
            Make room for creativity, connection and fun.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink/70">
            Let&apos;s All Paints is a home for creative painting experiences and social events. You do
            not arrive as an artist — you sit with people you like, follow a guide, and leave with a
            canvas you made yourself.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/about" className="landing-btn landing-btn-gold">
              Our story
            </Link>
            <Link href="/book" className="landing-btn landing-btn-ink">
              Enrol
            </Link>
          </div>
        </div>
      </section>

      {/* Hangout feature — circular collage + copy */}
      {featured ? (
        <section className="border-t border-burgundy/8 bg-[#fbf8f4]">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-22">
            <div className="landing-circles relative mx-auto aspect-square w-full max-w-md">
              <div className="landing-circle landing-circle-main">
                <Image src="/logo.jpg" alt="" width={520} height={520} className="h-full w-full object-cover" />
              </div>
              <div className="landing-circle landing-circle-a">
                <Image src="/logo.jpg" alt="" width={200} height={200} className="h-full w-full object-cover object-[30%_40%]" />
              </div>
              <div className="landing-circle landing-circle-b">
                <Image src="/logo.jpg" alt="" width={160} height={160} className="h-full w-full object-cover object-[70%_60%]" />
              </div>
              <span className="landing-dot landing-dot-d" aria-hidden />
            </div>
            <div>
              <p className="text-[0.7rem] font-medium tracking-[0.22em] text-burgundy uppercase">
                The hangout
              </p>
              <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight md:text-5xl">
                {featured.name}
              </h2>
              <p className="mt-2 font-display text-xl text-burgundy">
                {featured.city} · {featured.whenLabel}
              </p>
              <div className="mt-5 space-y-4 text-base leading-relaxed text-ink/75">
                {story.slice(0, 2).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <Link href={eventHref} className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-burgundy">
                See the hangout <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* Inclusions + large visual */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-[1fr_0.95fr] md:py-22">
        <div>
          <h2 className="font-display text-4xl leading-tight tracking-tight md:text-5xl">
            Leave with a day worth remembering.
          </h2>
          <p className="mt-4 max-w-md text-ink/70">
            {featured
              ? "Everything listed for the day is part of enrolment once the venue is locked in."
              : "Hangouts are built around a guided canvas, good company, and a table that feels easy for beginners."}
          </p>
          <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4">
            {(featured?.inclusions.slice(0, 4) ?? [
              "Guided painting",
              "Materials included",
              "Food & drink",
              "Your canvas to keep",
            ]).map((item, index) => (
              <li key={item} className="text-center sm:text-left">
                <span className="landing-icon" aria-hidden>
                  {["◈", "◇", "○", "△"][index % 4]}
                </span>
                <p className="mt-3 text-sm leading-snug font-medium text-ink">{item}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="landing-portrait relative">
          <div className="overflow-hidden rounded-[2rem] shadow-[0_28px_60px_rgba(117,41,77,0.18)]">
            <Image
              src="/logo.jpg"
              alt="Let's All Paints"
              width={800}
              height={1000}
              className="aspect-[4/5] w-full object-cover"
            />
          </div>
          <span className="landing-dot landing-dot-e" aria-hidden />
        </div>
      </section>
    </div>
  );
}
