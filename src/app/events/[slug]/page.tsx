import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventCover } from "@/components/EventCover";
import { formatLondon, getEvent, isEnrollmentOpen, storyParagraphs } from "@/lib/events";
import { formatGbp } from "@/lib/money";
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
  const tickets = await listCategories(hangout.slug, true);

  const payCopy = hangout.isFree
    ? "Free to attend."
    : tickets.length > 0
      ? hangout.paymentTiming === "now"
        ? "Choose a ticket below. Payment is taken securely on Stripe after enrolment."
        : "Choose a ticket below. You enrol first; we email a Stripe payment link afterwards."
      : hangout.pricePence == null
        ? "The price has not been published yet. Enrolment does not take payment."
        : hangout.paymentTiming === "now"
          ? `${formatGbp(hangout.pricePence)} per person. Payment is taken straight after you enrol.`
          : `${formatGbp(hangout.pricePence)} per person. You enrol first. We email a payment link afterwards.`;

  return (
    <article className="mx-auto max-w-3xl px-5 py-14">
      <EventCover
        event={hangout}
        className="mb-8 aspect-[16/9] rounded-[1.6rem]"
        sizes="(max-width: 768px) 100vw, 720px"
        priority
      />
      <p className="text-xs tracking-[0.2em] text-burgundy uppercase">
        {hangout.city} · {hangout.whenLabel}
      </p>
      <h1 className="mt-3 font-display text-6xl leading-[0.92]">{hangout.name}</h1>
      <p className="mt-4 text-xl text-ink/80">{hangout.summary}</p>

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        {[
          ["When", `${hangout.whenLabel}. ${hangout.timeLabel}.`],
          ["Where", `${hangout.city}. ${hangout.venue}.`],
          [
            "Enrolment",
            soldOut
              ? "Sold out"
              : open
                ? `Open until ${formatLondon(hangout.enrollmentEndsAt)} · ${remaining} places left`
                : `Closed ${formatLondon(hangout.enrollmentEndsAt)}`,
          ],
          ["What you pay", payCopy],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white p-4">
            <dt className="text-xs tracking-[0.14em] text-burgundy uppercase">{label}</dt>
            <dd className="mt-2">{value}</dd>
          </div>
        ))}
      </dl>

      {tickets.length > 0 ? (
        <>
          <h2 className="mt-12 font-display text-3xl">Tickets</h2>
          <ul className="mt-4 space-y-3">
            {tickets.map((ticket) => (
              <li key={ticket.id} className="rounded-2xl border border-burgundy/10 bg-white p-4">
                <p className="font-display text-2xl">{ticket.name}</p>
                <p className="mt-1 text-sm text-ink/75">{ticket.description}</p>
                <p className="mt-2 text-sm">
                  {ticket.pricePence === 0 ? "Free" : formatGbp(ticket.pricePence)}
                  {ticket.seatsPerTicket > 1 ? ` · ${ticket.seatsPerTicket} seats` : ""}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : null}

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

      {open && !soldOut ? (
        <Link href="/book" className="mt-10 inline-block rounded-full bg-burgundy px-5 py-3 text-cream">
          Enrol
        </Link>
      ) : (
        <p className="mt-10 text-ink/70">{soldOut ? "This hangout is sold out." : "Enrolment for this hangout is not open."}</p>
      )}
    </article>
  );
}
