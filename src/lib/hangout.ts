/** Client-safe hangout types and helpers (no DB imports). */

export type PaymentTiming = "now" | "later";

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
  imageUrl: string;
  eventDate: string;
  eventTime: string;
};

/** Cover image for cards and detail pages; falls back to a stock placeholder. */
export function eventCoverUrl(hangout: Pick<Hangout, "imageUrl">) {
  return hangout.imageUrl || "/landing-hero.webp";
}

export function hasCustomCover(hangout: Pick<Hangout, "imageUrl">) {
  return Boolean(hangout.imageUrl);
}

export function storyParagraphs(story: string) {
  return story
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function formatLondon(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    dateStyle: "medium",
    timeStyle: "short",
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
