import { query } from "./db";
import { poundsToPence } from "./money";

export type PaymentTiming = "now" | "later";
export type PricingChoice = "per_person" | "family" | "custom";

export type Hangout = {
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  city: string;
  venue: string;
  whenLabel: string;
  timeLabel: string;
  story: string;
  inclusions: string[];
  capacity: number;
  enrollmentStartsAt: string;
  enrollmentEndsAt: string;
  isFree: boolean;
  pricePence: number | null;
  familyPricePence: number | null;
  paymentTiming: PaymentTiming;
  published: boolean;
};

export type EventInput = {
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  city: string;
  venue: string;
  whenLabel: string;
  timeLabel: string;
  story: string;
  inclusions: string;
  capacity: number;
  enrollmentStartsAt: string;
  enrollmentEndsAt: string;
  isFree: boolean;
  pricePence: number | null;
  familyPricePence: number | null;
  paymentTiming: PaymentTiming;
  published: boolean;
};

type EventRow = {
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  city: string;
  venue: string;
  when_label: string;
  time_label: string;
  story: string;
  inclusions: string;
  capacity: number;
  enrollment_starts_at: Date;
  enrollment_ends_at: Date;
  is_free: boolean;
  price_pence: number | null;
  family_price_pence: number | null;
  payment_timing: PaymentTiming;
  published: boolean;
};

export class EventError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const seedStory = [
  "Eat, Drink & Paint is the first Let's All Paints hangout. It is planned as an easygoing afternoon in Leicester: a table, a canvas, something to eat, and people you actually want to spend the day with.",
  "You do not need to have painted before. A guide walks the room through the picture, and you make it your own. Drinks include non-alcoholic options. Alcohol is not required to take part.",
  "The exact day and venue are still being confirmed. Enrolment holds your place. Payment follows the setting on this event.",
].join("\n\n");

const seedInclusions = [
  "A guided painting session suitable for beginners",
  "Canvas, paints and brushes",
  "A shared table with food and drinks",
  "Non-alcoholic options at the table",
].join("\n");

export async function seedFeaturedEvent() {
  const { getPool } = await import("./db");
  await getPool().query(
    `INSERT INTO events (
      slug, name, tagline, summary, city, venue, when_label, time_label, story, inclusions,
      capacity, enrollment_starts_at, enrollment_ends_at, is_free, price_pence, family_price_pence,
      payment_timing, published
    ) VALUES (
      'eat-drink-paint',
      'Eat, Drink & Paint',
      'A creative day for everyone.',
      'A relaxed painting hangout. Sit down with friends or family, follow a friendly guide, and leave with a canvas you made yourself.',
      'Leicester, UK',
      'Venue to be confirmed',
      'May 2027',
      'Day and time to be confirmed',
      $1,
      $2,
      80,
      '2026-10-01T00:00:00.000Z',
      '2027-04-30T22:59:59.000Z',
      FALSE,
      NULL,
      NULL,
      'later',
      TRUE
    )
    ON CONFLICT (slug) DO NOTHING`,
    [seedStory, seedInclusions],
  );
}

function lines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function mapEvent(row: EventRow): Hangout {
  return {
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    summary: row.summary,
    city: row.city,
    venue: row.venue,
    whenLabel: row.when_label,
    timeLabel: row.time_label,
    story: row.story,
    inclusions: lines(row.inclusions),
    capacity: row.capacity,
    enrollmentStartsAt: new Date(row.enrollment_starts_at).toISOString(),
    enrollmentEndsAt: new Date(row.enrollment_ends_at).toISOString(),
    isFree: row.is_free,
    pricePence: row.price_pence,
    familyPricePence: row.family_price_pence,
    paymentTiming: row.payment_timing,
    published: row.published,
  };
}

export function storyParagraphs(story: string) {
  return story
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function formatLondon(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}

export function enrollmentState(hangout: Hangout, now = new Date()) {
  if (!hangout.published) return "closed" as const;
  if (now < new Date(hangout.enrollmentStartsAt)) return "upcoming" as const;
  if (now > new Date(hangout.enrollmentEndsAt)) return "closed" as const;
  return "open" as const;
}

export function isEnrollmentOpen(hangout: Hangout, now = new Date()) {
  return enrollmentState(hangout, now) === "open";
}

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function moneyField(value: unknown, label: string, maxPence: number) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const pence = poundsToPence(text);
  if (pence === null || pence < 50 || pence > maxPence) {
    throw new EventError(`${label} must be between £0.50 and £${(maxPence / 100).toFixed(0)}.`, 400);
  }
  return pence;
}

export function parseEventInput(body: unknown, slugOverride?: string): EventInput {
  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const rawSlug = slugOverride ?? clean(source.slug, 80);
  const slug = (rawSlug || clean(source.name, 80))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new EventError("Use a short slug made of letters, numbers and hyphens.", 400);
  }
  const name = clean(source.name, 80);
  if (name.length < 3) throw new EventError("Add the event name.", 400);
  const capacity = Number(source.capacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) {
    throw new EventError("Capacity must be a whole number from 1 to 500.", 400);
  }
  const starts = new Date(String(source.enrollmentStartsAt ?? ""));
  const ends = new Date(String(source.enrollmentEndsAt ?? ""));
  if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
    throw new EventError("Add an enrolment start and end.", 400);
  }
  if (ends <= starts) {
    throw new EventError("Enrolment must end after it starts.", 400);
  }
  const isFree = Boolean(source.isFree);
  const paymentTiming = source.paymentTiming === "now" ? "now" : "later";
  const pricePence = isFree ? null : moneyField(source.pricePerPerson, "The price per person", 50_000);
  if (!isFree && pricePence === null) {
    throw new EventError("A paid event needs a price per person.", 400);
  }
  const familyPricePence = isFree ? null : moneyField(source.familyPrice, "The family or group price", 500_000);
  const inclusions = String(source.inclusions ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12)
    .join("\n");
  return {
    slug,
    name,
    tagline: clean(source.tagline, 140),
    summary: clean(source.summary, 400),
    city: clean(source.city, 80),
    venue: clean(source.venue, 120),
    whenLabel: clean(source.whenLabel, 80),
    timeLabel: clean(source.timeLabel, 80),
    story: String(source.story ?? "").trim().slice(0, 4000),
    inclusions,
    capacity,
    enrollmentStartsAt: starts.toISOString(),
    enrollmentEndsAt: ends.toISOString(),
    isFree,
    pricePence,
    familyPricePence,
    paymentTiming: isFree ? "later" : paymentTiming,
    published: source.published !== false,
  };
}

const columns = `slug, name, tagline, summary, city, venue, when_label, time_label, story, inclusions,
  capacity, enrollment_starts_at, enrollment_ends_at, is_free, price_pence, family_price_pence,
  payment_timing, published`;

export async function listEvents() {
  const result = await query<EventRow>(`SELECT ${columns} FROM events ORDER BY enrollment_starts_at DESC`);
  return result.rows.map(mapEvent);
}

export async function listPublishedEvents() {
  const result = await query<EventRow>(
    `SELECT ${columns} FROM events WHERE published = TRUE ORDER BY enrollment_starts_at ASC`,
  );
  return result.rows.map(mapEvent);
}

export async function getEvent(slug: string) {
  const result = await query<EventRow>(`SELECT ${columns} FROM events WHERE slug = $1`, [slug]);
  return result.rows[0] ? mapEvent(result.rows[0]) : null;
}

export async function getFeaturedEvent(): Promise<Hangout | null> {
  const events = await listPublishedEvents();
  return events.find((hangout) => isEnrollmentOpen(hangout)) ?? events.at(0) ?? null;
}

export async function createEvent(input: EventInput) {
  try {
    const result = await query<EventRow>(
      `INSERT INTO events (
        slug, name, tagline, summary, city, venue, when_label, time_label, story, inclusions,
        capacity, enrollment_starts_at, enrollment_ends_at, is_free, price_pence, family_price_pence,
        payment_timing, published
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING ${columns}`,
      eventValues(input),
    );
    return mapEvent(result.rows[0]!);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "23505") throw new EventError("An event with that slug already exists.", 409);
    throw error;
  }
}

export async function updateEvent(slug: string, input: EventInput) {
  const result = await query<EventRow>(
    `UPDATE events SET
      name = $2,
      tagline = $3,
      summary = $4,
      city = $5,
      venue = $6,
      when_label = $7,
      time_label = $8,
      story = $9,
      inclusions = $10,
      capacity = $11,
      enrollment_starts_at = $12,
      enrollment_ends_at = $13,
      is_free = $14,
      price_pence = $15,
      family_price_pence = $16,
      payment_timing = $17,
      published = $18
    WHERE slug = $1
    RETURNING ${columns}`,
    eventValues({ ...input, slug }),
  );
  return result.rows[0] ? mapEvent(result.rows[0]) : null;
}

function eventValues(input: EventInput) {
  return [
    input.slug,
    input.name,
    input.tagline,
    input.summary,
    input.city,
    input.venue,
    input.whenLabel,
    input.timeLabel,
    input.story,
    input.inclusions,
    input.capacity,
    input.enrollmentStartsAt,
    input.enrollmentEndsAt,
    input.isFree,
    input.pricePence,
    input.familyPricePence,
    input.paymentTiming,
    input.published,
  ];
}

export type Charge = {
  totalPence: number;
  unitPence: number;
  quantity: number;
  label: string;
  pricingChoice: PricingChoice;
};

export function quoteCharge(
  hangout: Hangout,
  seats: number,
  mode: PricingChoice,
  customPence?: number | null,
): Charge {
  if (hangout.isFree) {
    throw new EventError("This event is free. No payment link is needed.", 409);
  }
  if (mode === "custom") {
    if (customPence == null || customPence < 50 || customPence > 500_000) {
      throw new EventError("Enter a custom amount between £0.50 and £5,000.00.", 400);
    }
    return {
      totalPence: customPence,
      unitPence: customPence,
      quantity: 1,
      label: "Custom family or group price",
      pricingChoice: "custom",
    };
  }
  if (mode === "family") {
    if (hangout.familyPricePence == null) {
      throw new EventError("Set a family or group price on the event first, or enter a custom amount.", 400);
    }
    return {
      totalPence: hangout.familyPricePence,
      unitPence: hangout.familyPricePence,
      quantity: 1,
      label: "Family or group price",
      pricingChoice: "family",
    };
  }
  if (hangout.pricePence == null) {
    throw new EventError("Set a price per person on the event, or enter a custom amount for this party.", 400);
  }
  return {
    totalPence: hangout.pricePence * seats,
    unitPence: hangout.pricePence,
    quantity: seats,
    label: "Price per person",
    pricingChoice: "per_person",
  };
}

export function holdNote(hangout: Hangout) {
  if (hangout.isFree) return "This event is free. The voucher holds your places.";
  if (hangout.pricePence == null) {
    return "This voucher holds your places. The price is not published yet, so nothing is charged until we email you.";
  }
  if (hangout.paymentTiming === "now") {
    return "Your places are held. Payment is taken straight after enrolment. Card details are taken by Stripe.";
  }
  return "This voucher holds your places. We email a payment link after you enrol. Nothing is charged on the enrolment form.";
}
