import Stripe from "stripe";
import { bookingCart, markBookingPaid, type Booking } from "./bookings";
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

export async function createPaymentSession(booking: Booking, hangout: Hangout, charge?: Charge) {
  const items = await bookingCart(booking.code);
  const lineItems =
    items.length > 0
      ? items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: "gbp" as const,
            unit_amount: item.unitPricePence,
            product_data: {
              name: `${hangout.name} · ${item.categoryName}`,
              description: `${item.seats} seat${item.seats === 1 ? "" : "s"} · ${booking.code}`,
            },
          },
        }))
      : [
          {
            quantity: charge?.quantity ?? partySizeFallback(booking),
            price_data: {
              currency: "gbp" as const,
              unit_amount: charge?.unitPence ?? 0,
              product_data: {
                name: `${hangout.name} · ${booking.code}`,
                description: `${charge?.label ?? "Ticket"} · ${partyLabel(booking)} · ${hangout.city} · ${hangout.whenLabel}`,
              },
            },
          },
        ];

  if (lineItems.some((item) => item.price_data.unit_amount < 1)) {
    throw new Error("Cannot charge a free ticket through Stripe.");
  }

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: booking.email,
    client_reference_id: booking.code,
    metadata: { bookingCode: booking.code },
    expires_at: Math.floor(Date.now() / 1000) + 23 * 60 * 60,
    success_url: `${confirmationUrl(booking.code)}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: confirmationUrl(booking.code),
    line_items: lineItems,
  });
  if (!session.url) throw new Error("Stripe did not return a payment link.");
  return session;
}

function partySizeFallback(booking: Booking) {
  return Math.max(1, booking.adults + booking.children);
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

export async function refundCheckoutSession(sessionId: string) {
  if (!sessionId.startsWith("cs_")) {
    throw new Error("This booking has no Stripe Checkout session to refund.");
  }
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  const paymentIntent = session.payment_intent;
  const paymentIntentId =
    typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id ?? null;
  if (!paymentIntentId) {
    throw new Error("Stripe has not recorded a payment for this checkout session yet.");
  }
  return getStripe().refunds.create({
    payment_intent: paymentIntentId,
    reason: "requested_by_customer",
  });
}

export type CheckoutRefundProbe = {
  paymentIntentId: string | null;
  amountTotal: number | null;
  amountRefunded: number;
  fullyRefunded: boolean;
  hasSucceededRefund: boolean;
  latestRefundId: string | null;
  latestRefundStatus: string | null;
};

/** Read Stripe for a Checkout session and report whether the payment was refunded. */
export async function probeCheckoutRefundStatus(sessionId: string): Promise<CheckoutRefundProbe | null> {
  if (!stripeConfigured() || !sessionId.startsWith("cs_")) return null;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });
    const paymentIntent =
      typeof session.payment_intent === "object" && session.payment_intent
        ? session.payment_intent
        : null;
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : paymentIntent?.id ?? null;

    let amountRefunded = 0;
    let latestRefundId: string | null = null;
    let latestRefundStatus: string | null = null;
    let hasSucceededRefund = false;

    if (paymentIntentId) {
      const refunds = await getStripe().refunds.list({
        payment_intent: paymentIntentId,
        limit: 20,
      });
      for (const refund of refunds.data) {
        if (refund.status === "succeeded") {
          hasSucceededRefund = true;
          amountRefunded += refund.amount;
        }
        if (!latestRefundId) {
          latestRefundId = refund.id;
          latestRefundStatus = refund.status;
        }
      }
    }

    const amountTotal =
      typeof session.amount_total === "number"
        ? session.amount_total
        : paymentIntent && typeof paymentIntent.amount === "number"
          ? paymentIntent.amount
          : null;
    const fullyRefunded =
      hasSucceededRefund &&
      amountTotal != null &&
      amountTotal > 0 &&
      amountRefunded >= amountTotal;

    return {
      paymentIntentId,
      amountTotal,
      amountRefunded,
      fullyRefunded: fullyRefunded || (hasSucceededRefund && amountTotal == null),
      hasSucceededRefund,
      latestRefundId,
      latestRefundStatus,
    };
  } catch {
    return null;
  }
}
