import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatLondon, getEvent, isEnrollmentOpen, storyParagraphs } from "@/lib/events";
import { formatGbp } from "@/lib/money";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const hangout = await getEvent(slug).catch(() => null);
  if (!hangout) return { title: "Hangout" };
  return { title: hangout.name, description: hangout.summary };
}

function priceCopy(hangout: NonNullable<Awaited<ReturnType<typeof getEvent>>>) {
  if (hangout.isFree) return "Free to attend.";
  if (hangout.pricePence == null) return "The price has not been published yet. Enrolment does not take payment.";
  const family = hangout.familyPricePence
    ? ` A family or group booking can use a set price of ${formatGbp(hangout.familyPricePence)}.`
    : "";
  if (hangout.paymentTiming === "now") {
    return `${formatGbp(hangout.pricePence)} per person. Payment is taken straight after you enrol.${family}`;
  }
  return `${formatGbp(hangout.pricePence)} per person. You enrol first. We email a payment link afterwards.${family}`;
}

export default async function EventPage({ params }: Params) {
  const { slug } = await params;
  const hangout = await getEvent(slug);
  if (!hangout || !hangout.published) notFound();
  const open = isEnrollmentOpen(hangout);

  return (
    <article className="mx-auto max-w-3xl px-5 py-14">
      <p className="text-xs tracking-[0.2em] text-burgundy uppercase">
        {hangout.city} · {hangout.whenLabel}
      </p>
      <h1 className="mt-3 font-display text-6xl leading-[0.92]">{hangout.name}</h1>
      <p className="mt-4 text-xl text-ink/80">{hangout.summary}</p>

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        {[
          ["When", `${hangout.whenLabel}. ${hangout.timeLabel}.`],
          ["Where", `${hangout.city}. ${hangout.venue}.`],
          ["Enrolment", open ? `Open until ${formatLondon(hangout.enrollmentEndsAt)}` : `Closed ${formatLondon(hangout.enrollmentEndsAt)}`],
          ["What you pay", priceCopy(hangout)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white p-4">
            <dt className="text-xs tracking-[0.14em] text-burgundy uppercase">{label}</dt>
            <dd className="mt-2">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 space-y-4 leading-relaxed text-ink/80">
        {storyParagraphs(hangout.story).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      {hangout.inclusions.length > 0 ? (
        <>
          <h2 className="mt-12 font-display text-3xl">Planned for the table</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-ink/80">
            {hangout.inclusions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      ) : null}

      {open ? (
        <Link href="/book" className="mt-10 inline-block rounded-full bg-burgundy px-5 py-3 text-cream">
          Enrol
        </Link>
      ) : (
        <p className="mt-10 text-ink/70">Enrolment for this hangout is not open.</p>
      )}
    </article>
  );
}
