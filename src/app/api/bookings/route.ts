import { NextResponse } from "next/server";
import { BookingError, createBooking, markEmailStatus, parseBookingInput, partySize, savePaymentLink } from "@/lib/bookings";
import { sendBookingEmails } from "@/lib/email";
import { EventError, getEvent, quoteCharge } from "@/lib/events";
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
    if (hangout && !hangout.isFree && hangout.paymentTiming === "now" && hangout.pricePence) {
      try {
        const charge = quoteCharge(
          hangout,
          partySize(booking),
          booking.pricingChoice === "family" ? "family" : "per_person",
        );
        if (stripeConfigured()) {
          const session = await createPaymentSession(booking, hangout, charge);
          await savePaymentLink(booking.code, session.url!, session.id, charge.totalPence, charge.pricingChoice);
          checkoutUrl = session.url!;
        }
      } catch (error) {
        if (!(error instanceof EventError)) throw error;
      }
    }
    return NextResponse.json({
      code: booking.code,
      emailSent: email.sent,
      checkoutUrl,
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
