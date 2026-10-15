import { NextResponse } from "next/server";
import {
  BookingError,
  createBooking,
  markEmailStatus,
  parseBookingInput,
  savePaymentLink,
  bookingCart,
} from "@/lib/bookings";
import { sendBookingEmails } from "@/lib/email";
import { getEvent } from "@/lib/events";
import { listCategories } from "@/lib/ticket-categories";
import { createPaymentSession, stripeConfigured } from "@/lib/stripe";

const hits = new Map<string, number[]>();

function limited(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < 60_000);
  if (recent.length >= 8) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export async function POST(request: Request) {
  if (limited(request)) {
    return NextResponse.json(
      { message: "Too many attempts. Wait a minute and try again." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "The booking form was empty." }, { status: 400 });
  }

  try {
    const booking = await createBooking(parseBookingInput(body));
    const email = await sendBookingEmails(booking);
    const emailStatus = email.sent ? "sent" : email.reason?.includes("not configured") ? "unconfigured" : "failed";
    await markEmailStatus(booking.code, emailStatus);
    const hangout = await getEvent(booking.eventSlug);
    let checkoutUrl: string | undefined;

    const shouldPayNow =
      hangout &&
      !hangout.isFree &&
      booking.paymentStatus === "unpaid" &&
      hangout.paymentTiming === "now" &&
      (booking.amountPence ?? 0) > 0;

    if (shouldPayNow && stripeConfigured()) {
      const session = await createPaymentSession(booking, hangout);
      const amount =
        booking.amountPence ??
        (await bookingCart(booking.code)).reduce((sum, item) => sum + item.unitPricePence * item.quantity, 0);
      await savePaymentLink(booking.code, session.url!, session.id, amount, booking.pricingChoice);
      checkoutUrl = session.url!;
    }

    const categories = hangout ? await listCategories(hangout.slug, true) : [];
    return NextResponse.json({
      code: booking.code,
      emailSent: email.sent,
      checkoutUrl,
      soldOut: false,
      hasTickets: categories.length > 0,
      message: checkoutUrl
        ? "Enrolment saved. Continue to payment."
        : email.sent
          ? "Enrolment saved and voucher sent."
          : "Enrolment saved. The voucher is on the next page.",
    });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ message: error.message, field: error.field }, { status: error.status });
    }
    return NextResponse.json({ message: "We could not save the reservation." }, { status: 500 });
  }
}
