import Stripe from "stripe";
import { markBookingPaid, type Booking } from "./bookings";
import type { Charge, Hangout } from "./events";
import { confirmationUrl, partyLabel } from "./ticket";

let stripe: Stripe | null = null;

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  stripe ??= new Stripe(key);
  return stripe;
}

export async function createPaymentSession(booking: Booking, hangout: Hangout, charge: Charge) {
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: booking.email,
    client_reference_id: booking.code,
    metadata: { bookingCode: booking.code },
    expires_at: Math.floor(Date.now() / 1000) + 23 * 60 * 60,
    success_url: `${confirmationUrl(booking.code)}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: confirmationUrl(booking.code),
    line_items: [
      {
        quantity: charge.quantity,
        price_data: {
          currency: "gbp",
          unit_amount: charge.unitPence,
          product_data: {
            name: `${hangout.name} · ${booking.code}`,
            description: `${charge.label} · ${partyLabel(booking)} · ${hangout.city} · ${hangout.whenLabel}`,
          },
        },
      },
    ],
  });
  if (!session.url) throw new Error("Stripe did not return a payment link.");
  return session;
}

export async function confirmCheckoutSession(code: string, sessionId: string) {
  try {
    if (!stripeConfigured() || !sessionId.startsWith("cs_")) return null;
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.metadata?.bookingCode !== code || session.payment_status !== "paid") return null;
    return settlePaidSession(code, session.id, session.amount_total);
  } catch {
    return null;
  }
}

export async function settlePaidSession(code: string, sessionId: string, amountPence: number | null) {
  const booking = await markBookingPaid(code, sessionId, amountPence);
  if (booking) {
    const { sendPaymentReceipt } = await import("./email");
    await sendPaymentReceipt(booking).catch(() => undefined);
  }
  return booking;
}
