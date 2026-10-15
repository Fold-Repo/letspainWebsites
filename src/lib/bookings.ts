import { randomBytes } from "crypto";
import { query } from "./db";
import { enrollmentState, formatLondon, getEvent, type PricingChoice } from "./events";

export type Booking = {
  code: string;
  eventSlug: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  adults: number;
  children: number;
  notes: string;
  marketingOptIn: boolean;
  createdAt: string;
  emailStatus: "pending" | "sent" | "unconfigured" | "failed";
  paymentStatus: "unpaid" | "link_sent" | "paid" | "free";
  pricingChoice: PricingChoice;
  amountPence: number | null;
  currency: string;
  stripeSessionId: string | null;
  checkoutUrl: string | null;
  paidAt: string | null;
};

export type BookingInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  adults: number;
  children: number;
  notes: string;
  marketingOptIn: boolean;
  termsAccepted: boolean;
  company: string;
  eventSlug: string;
  familyRate: boolean;
};

type BookingRow = {
  code: string;
  event_slug: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  adults: number;
  children: number;
  notes: string;
  marketing_opt_in: boolean;
  created_at: Date;
  email_status: Booking["emailStatus"];
  payment_status: Booking["paymentStatus"];
  pricing_choice: PricingChoice;
  amount_pence: number | null;
  currency: string;
  stripe_session_id: string | null;
  checkout_url: string | null;
  paid_at: Date | null;
};

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
  const bytes = randomBytes(6);
  let code = "LAP-";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[bytes[i]! % alphabet.length];
  }
  return code;
}

export function partySize(booking: Pick<Booking, "adults" | "children">) {
  return booking.adults + booking.children;
}

export function guestName(booking: Pick<Booking, "firstName" | "lastName">) {
  return `${booking.firstName} ${booking.lastName}`.trim();
}

export function mapBooking(row: BookingRow): Booking {
  return {
    code: row.code,
    eventSlug: row.event_slug,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    adults: row.adults,
    children: row.children,
    notes: row.notes,
    marketingOptIn: row.marketing_opt_in,
    createdAt: new Date(row.created_at).toISOString(),
    emailStatus: row.email_status,
    paymentStatus: row.payment_status,
    pricingChoice: row.pricing_choice,
    amountPence: row.amount_pence,
    currency: row.currency,
    stripeSessionId: row.stripe_session_id,
    checkoutUrl: row.checkout_url,
    paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : null,
  };
}

export class BookingError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly field?: string,
  ) {
    super(message);
  }
}

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function parseBookingInput(body: unknown): BookingInput {
  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const adults = Number(source.adults);
  const children = Number(source.children);
  return {
    firstName: clean(source.firstName, 60),
    lastName: clean(source.lastName, 60),
    email: clean(source.email, 120).toLowerCase(),
    phone: clean(source.phone, 30),
    adults: Number.isFinite(adults) ? adults : 0,
    children: Number.isFinite(children) ? children : 0,
    notes: clean(source.notes, 500),
    marketingOptIn: Boolean(source.marketingOptIn),
    termsAccepted: Boolean(source.termsAccepted),
    company: clean(source.company, 80),
    eventSlug: clean(source.eventSlug, 60).toLowerCase(),
    familyRate: Boolean(source.familyRate),
  };
}

function validate(input: BookingInput) {
  if (input.company) {
    throw new BookingError("We could not save that reservation.", 400);
  }
  if (input.firstName.length < 2) {
    throw new BookingError("Add the lead booker's first name.", 400, "firstName");
  }
  if (input.lastName.length < 2) {
    throw new BookingError("Add the lead booker's last name.", 400, "lastName");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new BookingError("Add a valid email so we can send the voucher.", 400, "email");
  }
  if (input.phone && !/^[0-9+().\-\s]{7,30}$/.test(input.phone)) {
    throw new BookingError("Check the phone number, or leave it blank.", 400, "phone");
  }
  if (!Number.isInteger(input.adults) || input.adults < 1 || input.adults > 8) {
    throw new BookingError("Choose between 1 and 8 adults.", 400, "adults");
  }
  if (!Number.isInteger(input.children) || input.children < 0 || input.children > 8) {
    throw new BookingError("Choose between 0 and 8 children.", 400, "children");
  }
  if (!input.termsAccepted) {
    throw new BookingError("Please accept the reservation terms.", 400, "termsAccepted");
  }
}

export async function createBooking(input: BookingInput) {
  validate(input);
  const { getPool, readyDatabase } = await import("./db");
  await readyDatabase();
  const client = await getPool().connect();
  try {
    const hangout = await getEvent(input.eventSlug);
    if (!hangout) {
      throw new BookingError("Choose a hangout that is open for enrolment.", 404, "eventSlug");
    }
    const window = enrollmentState(hangout);
    if (window === "upcoming") {
      throw new BookingError(
        `Enrolment for ${hangout.name} opens on ${formatLondon(hangout.enrollmentStartsAt)}.`,
        409,
        "eventSlug",
      );
    }
    if (window === "closed") {
      throw new BookingError(
        `Enrolment for ${hangout.name} closed on ${formatLondon(hangout.enrollmentEndsAt)}.`,
        409,
        "eventSlug",
      );
    }
    if (input.familyRate && hangout.familyPricePence == null) {
      throw new BookingError("This hangout does not have a family or group price.", 400, "familyRate");
    }
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [hangout.slug]);
    const existing = await client.query(
      "SELECT code FROM bookings WHERE event_slug = $1 AND email = $2",
      [hangout.slug, input.email],
    );
    if ((existing.rowCount ?? 0) > 0) {
      throw new BookingError(
        "This email already has a reservation. Check your inbox for the voucher, or write to us if you need to change the party.",
        409,
        "email",
      );
    }
    const takenResult = await client.query<{ taken: number }>(
      "SELECT COALESCE(SUM(adults + children), 0)::int AS taken FROM bookings WHERE event_slug = $1",
      [hangout.slug],
    );
    const taken = takenResult.rows[0]?.taken ?? 0;
    const seats = partySize(input);
    const remaining = hangout.capacity - taken;
    if (seats > remaining) {
      throw new BookingError(
        remaining > 0
          ? `Only ${remaining} ${remaining === 1 ? "place is" : "places are"} left. Reduce the party size or write to us.`
          : "This hangout is fully reserved.",
        409,
        "adults",
      );
    }
    const inserted = await client.query<BookingRow>(
      `INSERT INTO bookings (
        code, event_slug, first_name, last_name, email, phone, adults, children, notes, marketing_opt_in,
        pricing_choice, payment_status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
      [
        makeCode(),
        hangout.slug,
        input.firstName,
        input.lastName,
        input.email,
        input.phone,
        input.adults,
        input.children,
        input.notes,
        input.marketingOptIn,
        input.familyRate ? "family" : "per_person",
        hangout.isFree ? "free" : "unpaid",
      ],
    );
    await client.query("COMMIT");
    return mapBooking(inserted.rows[0]!);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function markEmailStatus(code: string, emailStatus: Booking["emailStatus"]) {
  const result = await query<BookingRow>(
    "UPDATE bookings SET email_status = $2 WHERE code = $1 RETURNING *",
    [code, emailStatus],
  );
  return result.rows[0] ? mapBooking(result.rows[0]) : null;
}

export async function getBooking(code: string) {
  const result = await query<BookingRow>("SELECT * FROM bookings WHERE code = $1", [code.trim().toUpperCase()]);
  return result.rows[0] ? mapBooking(result.rows[0]) : null;
}

export async function listBookings() {
  const result = await query<BookingRow>("SELECT * FROM bookings ORDER BY created_at DESC");
  return result.rows.map(mapBooking);
}

export async function savePaymentLink(
  code: string,
  checkoutUrl: string,
  sessionId: string,
  amountPence: number,
  pricingChoice: PricingChoice,
) {
  const result = await query<BookingRow>(
    `UPDATE bookings
     SET checkout_url = $2,
         stripe_session_id = $3,
         amount_pence = $4,
         pricing_choice = $5,
         payment_status = 'link_sent'
     WHERE code = $1 AND payment_status NOT IN ('paid', 'free')
     RETURNING *`,
    [code, checkoutUrl, sessionId, amountPence, pricingChoice],
  );
  return result.rows[0] ? mapBooking(result.rows[0]) : null;
}

export async function markBookingPaid(code: string, sessionId: string, amountPence: number | null) {
  const result = await query<BookingRow>(
    `UPDATE bookings
     SET payment_status = 'paid',
         paid_at = COALESCE(paid_at, NOW()),
         stripe_session_id = $2,
         amount_pence = COALESCE($3, amount_pence)
     WHERE code = $1 AND payment_status <> 'paid'
     RETURNING *`,
    [code, sessionId, amountPence],
  );
  return result.rows[0] ? mapBooking(result.rows[0]) : null;
}
