import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/admin-session";
import { writeAudit } from "@/lib/audit";
import { bookingCart, getBooking, partySize, savePaymentLink } from "@/lib/bookings";
import { sendPaymentLinkEmail } from "@/lib/email";
import { EventError, getEvent, quoteCharge, type PricingChoice } from "@/lib/events";
import { poundsToPence } from "@/lib/money";
import { createPaymentSession, stripeConfigured } from "@/lib/stripe";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const admin = await requireCapability("payment_links");
  if (!admin) {
    return NextResponse.json({ message: "Sign in again." }, { status: 401 });
  }
  const { code } = await context.params;
  const booking = await getBooking(code);
  if (!booking) {
    return NextResponse.json({ message: "That reservation was not found." }, { status: 404 });
  }
  if (booking.paymentStatus === "paid") {
    return NextResponse.json({ message: "This reservation is already paid." }, { status: 409 });
  }
  if (booking.paymentStatus === "free") {
    return NextResponse.json({ message: "This event is free. No payment link is needed." }, { status: 409 });
  }
  const hangout = await getEvent(booking.eventSlug);
  if (!hangout) {
    return NextResponse.json({ message: "The event for this reservation no longer exists." }, { status: 404 });
  }
  let body: { mode?: string; customAmount?: string };
  try {
    body = (await request.json()) as { mode?: string; customAmount?: string };
  } catch {
    body = {};
  }
  const items = await bookingCart(booking.code);
  const cartTotal = items.reduce((sum, item) => sum + item.unitPricePence * item.quantity, 0);
  const mode =
    body.mode === "family" || body.mode === "custom" || body.mode === "per_person" || body.mode === "cart"
      ? body.mode
      : items.length > 0
        ? "cart"
        : "per_person";

  try {
    let totalPence = cartTotal;
    let pricingChoice: PricingChoice = "per_person";
    let charge = undefined as ReturnType<typeof quoteCharge> | undefined;

    if (mode === "cart") {
      if (cartTotal < 50) {
        return NextResponse.json(
          { message: "This booking has no priced tickets. Enter a custom amount." },
          { status: 400 },
        );
      }
      totalPence = cartTotal;
    } else {
      const customPence = mode === "custom" ? poundsToPence(String(body.customAmount ?? "")) : null;
      charge = quoteCharge(hangout, partySize(booking), mode, customPence);
      totalPence = charge.totalPence;
      pricingChoice = charge.pricingChoice;
    }

    if (!stripeConfigured()) {
      return NextResponse.json(
        { message: "Add STRIPE_SECRET_KEY before sending a payment link." },
        { status: 503 },
      );
    }
    const session = await createPaymentSession(booking, hangout, charge);
    const updated = await savePaymentLink(booking.code, session.url!, session.id, totalPence, pricingChoice);
    const emailed = await sendPaymentLinkEmail(updated ?? { ...booking, amountPence: totalPence }, session.url!);
    await writeAudit({
      actorEmail: admin.email,
      action: "payment_link",
      entityType: "booking",
      entityId: booking.code,
      detail: `mode=${mode};pence=${totalPence};emailed=${emailed.sent}`,
    });
    return NextResponse.json({
      url: session.url,
      emailSent: emailed.sent,
      message: emailed.sent
        ? `Payment link emailed to ${booking.email}. It expires in 24 hours.`
        : "Stripe created the link, but the email did not send. Copy it below.",
    });
  } catch (error) {
    if (error instanceof EventError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Stripe could not create the link.";
    return NextResponse.json({ message }, { status: 502 });
  }
}
