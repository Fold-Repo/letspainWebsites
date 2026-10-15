"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatGbp } from "@/lib/money";

export type BookableTicket = {
  id: number;
  name: string;
  description: string;
  kind: string;
  pricePence: number;
  seatsPerTicket: number;
  maxPerOrder: number;
};

export type BookableEvent = {
  slug: string;
  name: string;
  isFree: boolean;
  pricePence: number | null;
  familyPricePence: number | null;
  paymentTiming: "now" | "later";
  enrollmentEndsAt: string;
  remainingSeats: number;
  soldOut: boolean;
  tickets: BookableTicket[];
};

type FieldErrors = Partial<Record<string, string>>;

function termsCopy(event: BookableEvent, totalPence: number) {
  if (event.soldOut) return "This hangout is sold out.";
  if (event.isFree || totalPence === 0) return "I understand this enrols my party. Selected tickets are free.";
  if (event.tickets.length > 0) {
    if (event.paymentTiming === "now") {
      return `I understand I will pay ${formatGbp(totalPence)} securely on Stripe after this form. Card details are never stored on this site.`;
    }
    return `I understand this enrols my party for ${formatGbp(totalPence)}. Payment is not taken now. You will email a Stripe payment link.`;
  }
  if (event.pricePence == null) {
    return "I understand this enrols my party. The price is not published yet, so nothing is charged until you email me.";
  }
  if (event.paymentTiming === "now") {
    return `I understand I will be asked to pay after this form. Stripe takes the card.`;
  }
  return `I understand this enrols my party. Payment is not taken now. You will email a payment link.`;
}

export function BookingForm({ events }: { events: BookableEvent[] }) {
  const router = useRouter();
  const [slug, setSlug] = useState(events[0]?.slug ?? "");
  const [qty, setQty] = useState<Record<number, number>>({});
  const [error, setError] = useState("");
  const [fields, setFields] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const event = events.find((item) => item.slug === slug) ?? events[0];
  if (!event) return null;

  const totals = useMemo(() => {
    return event.tickets.reduce(
      (sum, ticket) => {
        const quantity = qty[ticket.id] ?? 0;
        return {
          seats: sum.seats + quantity * ticket.seatsPerTicket,
          amount: sum.amount + quantity * ticket.pricePence,
        };
      },
      { seats: 0, amount: 0 },
    );
  }, [event.tickets, qty]);

  const payNow =
    !event.soldOut &&
    !event.isFree &&
    event.paymentTiming === "now" &&
    (event.tickets.length > 0 ? totals.amount > 0 : event.pricePence != null);

  async function onSubmit(formData: FormData) {
    setError("");
    setFields({});
    setPending(true);
    const tickets = event.tickets
      .map((ticket) => ({ categoryId: ticket.id, quantity: qty[ticket.id] ?? 0 }))
      .filter((item) => item.quantity > 0);
    const payload = {
      eventSlug: formData.get("eventSlug"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      adults: formData.get("adults") ?? "1",
      children: formData.get("children") ?? "0",
      notes: formData.get("notes"),
      familyRate: formData.get("familyRate") === "on",
      marketingOptIn: formData.get("marketingOptIn") === "on",
      termsAccepted: formData.get("termsAccepted") === "on",
      company: formData.get("company"),
      tickets,
    };
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        code?: string;
        message?: string;
        field?: string;
        checkoutUrl?: string;
      };
      if (!response.ok || !data.code) {
        if (data.field) setFields({ [data.field]: data.message ?? "Check this field." });
        setError(data.message ?? "We could not save the enrolment.");
        setPending(false);
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      router.push(`/book/confirmation/${data.code}`);
    } catch {
      setError("We could not reach the booking service. Try again in a moment.");
      setPending(false);
    }
  }

  if (event.soldOut) {
    return (
      <p role="status" className="rounded-3xl bg-pink/30 px-5 py-6 text-ink">
        {event.name} is sold out. All {event.remainingSeats === 0 ? "places" : "remaining places"} are taken.
      </p>
    );
  }

  return (
    <form action={onSubmit} className="space-y-5" noValidate>
      <div className="hidden" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
      {events.length > 1 ? (
        <label className="block text-sm">
          Hangout
          <select
            name="eventSlug"
            value={slug}
            onChange={(input) => {
              setSlug(input.target.value);
              setQty({});
            }}
            className="field"
          >
            {events.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
                {item.soldOut ? " (sold out)" : ""}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="eventSlug" value={event.slug} />
      )}

      {event.tickets.length > 0 ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Tickets</legend>
          <p className="text-sm text-ink/70">{event.remainingSeats} places left.</p>
          {event.tickets.map((ticket) => {
            const quantity = qty[ticket.id] ?? 0;
            const max = Math.min(ticket.maxPerOrder, Math.floor(event.remainingSeats / ticket.seatsPerTicket) || 0);
            return (
              <div key={ticket.id} className="rounded-2xl border border-burgundy/10 bg-cream/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl">{ticket.name}</p>
                    <p className="mt-1 text-sm text-ink/70">{ticket.description}</p>
                    <p className="mt-1 text-sm">
                      {ticket.pricePence === 0 ? "Free" : formatGbp(ticket.pricePence)}
                      {ticket.seatsPerTicket > 1 ? ` · ${ticket.seatsPerTicket} seats` : ""}
                    </p>
                  </div>
                  <label className="block text-sm">
                    Qty
                    <select
                      className="field w-24"
                      value={quantity}
                      onChange={(input) =>
                        setQty((current) => ({ ...current, [ticket.id]: Number(input.target.value) }))
                      }
                    >
                      {Array.from({ length: Math.max(0, max) + 1 }, (_, index) => (
                        <option key={index} value={index}>
                          {index}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            );
          })}
          <p className="text-sm">
            {totals.seats} seat{totals.seats === 1 ? "" : "s"}
            {totals.amount > 0 ? ` · ${formatGbp(totals.amount)}` : ""}
          </p>
          {fields.tickets ? <p className="text-sm text-burgundy">{fields.tickets}</p> : null}
        </fieldset>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Adults
            <select name="adults" defaultValue="2" className="field">
              {Array.from({ length: 8 }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Children
            <select name="children" defaultValue="0" className="field">
              {Array.from({ length: 9 }, (_, index) => index).map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          First name
          <input name="firstName" autoComplete="given-name" required className="field" />
          {fields.firstName ? <span className="mt-1 block text-burgundy">{fields.firstName}</span> : null}
        </label>
        <label className="block text-sm">
          Last name
          <input name="lastName" autoComplete="family-name" required className="field" />
          {fields.lastName ? <span className="mt-1 block text-burgundy">{fields.lastName}</span> : null}
        </label>
      </div>
      <label className="block text-sm">
        Email for the ticket
        <input name="email" type="email" autoComplete="email" required className="field" />
        {fields.email ? <span className="mt-1 block text-burgundy">{fields.email}</span> : null}
      </label>
      <label className="block text-sm">
        Phone <span className="text-ink/50">(optional)</span>
        <input name="phone" type="tel" autoComplete="tel" className="field" />
        {fields.phone ? <span className="mt-1 block text-burgundy">{fields.phone}</span> : null}
      </label>
      <p className="text-sm text-ink/70">
        We ask for the lead booker only. Children are counted on child tickets, not named.
      </p>
      {event.tickets.length === 0 && event.familyPricePence != null ? (
        <label className="flex items-start gap-3 text-sm">
          <input name="familyRate" type="checkbox" className="mt-1 accent-burgundy" />
          <span>Use the family or group price of {formatGbp(event.familyPricePence)} for this party.</span>
        </label>
      ) : null}
      <label className="block text-sm">
        Access, dietary or other notes <span className="text-ink/50">(optional)</span>
        <textarea name="notes" rows={4} className="field" />
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input name="termsAccepted" type="checkbox" className="mt-1 accent-burgundy" required />
        <span>{termsCopy(event, totals.amount)}</span>
      </label>
      {fields.termsAccepted ? <p className="text-sm text-burgundy">{fields.termsAccepted}</p> : null}
      <label className="flex items-start gap-3 text-sm">
        <input name="marketingOptIn" type="checkbox" className="mt-1 accent-burgundy" />
        <span>Email me occasional news about future Let&apos;s All Paints hangouts.</span>
      </label>
      {error ? (
        <p role="alert" className="rounded-2xl bg-pink/40 px-4 py-3 text-sm text-ink">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || event.soldOut}
        className="w-full rounded-full bg-burgundy px-5 py-3 font-medium text-cream disabled:opacity-60"
      >
        {pending ? "Saving your places…" : payNow ? "Enrol and continue to payment" : "Enrol and email my ticket"}
      </button>
    </form>
  );
}
