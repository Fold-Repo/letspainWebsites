import { NextResponse } from "next/server";
import { markBookingRefunded } from "@/lib/refunds";
import { getBooking } from "@/lib/bookings";
import { settlePaidSession, getStripe, probeCheckoutRefundStatus } from "@/lib/stripe";
import { query } from "@/lib/db";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ message: "STRIPE_WEBHOOK_SECRET is not set." }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ message: "Missing Stripe signature." }, { status: 400 });
  }
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ message: "Invalid Stripe signature." }, { status: 400 });
  }
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    const code = session.metadata?.bookingCode;
    if (code && session.payment_status === "paid") {
      await settlePaidSession(code, session.id, session.amount_total);
    }
  }

  if (event.type === "charge.refunded" || event.type === "refund.updated") {
    let paymentIntentId: string | null = null;
    let refundId: string | null = null;

    if (event.type === "charge.refunded") {
      const charge = event.data.object;
      paymentIntentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id ?? null;
    } else {
      const refund = event.data.object;
      if (refund.status !== "succeeded") {
        return NextResponse.json({ received: true });
      }
      refundId = refund.id;
      paymentIntentId =
        typeof refund.payment_intent === "string"
          ? refund.payment_intent
          : refund.payment_intent?.id ?? null;
    }

    if (paymentIntentId) {
      const sessions = await getStripe().checkout.sessions.list({
        payment_intent: paymentIntentId,
        limit: 1,
      });
      const session = sessions.data[0];
      const code = session?.metadata?.bookingCode ?? session?.client_reference_id ?? null;
      if (code) {
        const booking = await getBooking(code);
        if (booking?.stripeSessionId) {
          const probe = await probeCheckoutRefundStatus(booking.stripeSessionId);
          if (probe?.fullyRefunded || probe?.hasSucceededRefund) {
            await markBookingRefunded(booking.code);
            if (refundId) {
              await query(
                `UPDATE refund_requests
                 SET stripe_refund_id = COALESCE(stripe_refund_id, $2),
                     status = CASE WHEN status = 'pending' THEN 'approved' ELSE status END,
                     resolved_at = COALESCE(resolved_at, NOW())
                 WHERE booking_code = $1`,
                [booking.code, refundId],
              ).catch(() => undefined);
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
