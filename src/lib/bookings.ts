import { randomBytes } from "crypto";
import type { PoolClient } from "pg";
import { query } from "./db";
import { enrollmentState, formatLondon, getEvent, type PricingChoice } from "./events";
import {
  linesTotal,
  listCategories,
  listBookingItems,
  resolveSelections,
  parseSelections,
  type ResolvedTicketLine,
  TicketError,
} from "./ticket-categories";

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
  checkedInAt: string | null;
  checkedInBy: string | null;
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
  tickets: ReturnType<typeof parseSelections>;
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
  checked_in_at: Date | null;
  checked_in_by: string | null;
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
    checkedInAt: row.checked_in_at ? new Date(row.checked_in_at).toISOString() : null,
    checkedInBy: row.checked_in_by,
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
    tickets: parseSelections(body),
  };
}

function validateLead(input: BookingInput) {
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
  if (!input.termsAccepted) {
    throw new BookingError("Please accept the reservation terms.", 400, "termsAccepted");
  }
}

async function insertItems(client: PoolClient, code: string, lines: ResolvedTicketLine[]) {
  for (const line of lines) {
    await client.query(
      `INSERT INTO booking_items
        (booking_code, category_id, category_name, quantity, unit_price_pence, seats)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [code, line.category.id, line.category.name, line.quantity, line.category.pricePence, line.seats],
    );
  }
}

export async function createBooking(input: BookingInput) {
  validateLead(input);
  const { getPool, readyDatabase } = await import("./db");
  await readyDatabase();
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

  const categories = await listCategories(hangout.slug, true);
  let adults = input.adults;
  let children = input.children;
  let amountPence: number | null = null;
  let lines: ResolvedTicketLine[] = [];
  let pricingChoice: PricingChoice = input.familyRate ? "family" : "per_person";

  if (categories.length > 0) {
    try {
      lines = resolveSelections(categories, input.tickets);
    } catch (error) {
      if (error instanceof TicketError) {
        throw new BookingError(error.message, error.status, "tickets");
      }
      throw error;
    }
    const totals = linesTotal(lines);
    adults = totals.adults;
    children = totals.children;
    amountPence = hangout.isFree ? 0 : totals.amountPence;
    pricingChoice = "per_person";
  } else {
    if (!Number.isInteger(input.adults) || input.adults < 1 || input.adults > 8) {
      throw new BookingError("Choose between 1 and 8 adults.", 400, "adults");
    }
    if (!Number.isInteger(input.children) || input.children < 0 || input.children > 8) {
      throw new BookingError("Choose between 0 and 8 children.", 400, "children");
    }
    if (input.familyRate && hangout.familyPricePence == null) {
      throw new BookingError("This hangout does not have a family or group price.", 400, "familyRate");
    }
  }

  const seats = adults + children;
  if (seats < 1) {
    throw new BookingError("Choose at least one place.", 400, "tickets");
  }

  const client = await getPool().connect();
  try {
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
    const remaining = hangout.capacity - taken;
    if (remaining <= 0) {
      throw new BookingError("This hangout is sold out.", 409, "tickets");
    }
    if (seats > remaining) {
      throw new BookingError(
        `Only ${remaining} ${remaining === 1 ? "place is" : "places are"} left. Reduce the ticket quantity.`,
        409,
        "tickets",
      );
    }
    const paymentStatus =
      hangout.isFree || (amountPence !== null && amountPence === 0 && categories.length > 0) ? "free" : "unpaid";
    const code = makeCode();
    const inserted = await client.query<BookingRow>(
      `INSERT INTO bookings (
        code, event_slug, first_name, last_name, email, phone, adults, children, notes, marketing_opt_in,
        pricing_choice, payment_status, amount_pence
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
      [
        code,
        hangout.slug,
        input.firstName,
        input.lastName,
        input.email,
        input.phone,
        adults,
        children,
        input.notes,
        input.marketingOptIn,
        pricingChoice,
        paymentStatus,
        amountPence,
      ],
    );
    if (lines.length > 0) {
      await insertItems(client, code, lines);
    }
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

export async function listBookingsForEvent(eventSlug: string) {
  const result = await query<BookingRow>(
    "SELECT * FROM bookings WHERE event_slug = $1 ORDER BY created_at DESC",
    [eventSlug],
  );
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

export async function checkInBooking(code: string, adminEmail: string) {
  const booking = await getBooking(code);
  if (!booking) {
    throw new BookingError("That ticket was not found.", 404);
  }
  if (booking.paymentStatus !== "paid" && booking.paymentStatus !== "free") {
    throw new BookingError("This ticket is not paid yet, so it cannot be checked in.", 409);
  }
  if (booking.checkedInAt) {
    throw new BookingError(
      `Already checked in at ${new Date(booking.checkedInAt).toLocaleString("en-GB")}. Duplicate admission blocked.`,
      409,
    );
  }
  const result = await query<BookingRow>(
    `UPDATE bookings
     SET checked_in_at = NOW(), checked_in_by = $2
     WHERE code = $1 AND checked_in_at IS NULL AND payment_status IN ('paid', 'free')
     RETURNING *`,
    [booking.code, adminEmail],
  );
  if (!result.rows[0]) {
    throw new BookingError("Could not check this ticket in. Refresh and try again.", 409);
  }
  return mapBooking(result.rows[0]);
}

export async function bookingCart(code: string) {
  return listBookingItems(code);
}
