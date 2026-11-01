import { NextResponse } from "next/server";
import { BookingError, getBooking } from "@/lib/bookings";
import { sendRefundRequestedEmail } from "@/lib/email";
import { createRefundRequest } from "@/lib/refunds";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: string; reason?: string };
    const refund = await createRefundRequest(String(body.code ?? ""), String(body.reason ?? ""));
    const booking = await getBooking(refund.bookingCode);
    if (booking) {
      await sendRefundRequestedEmail(booking, refund.reason).catch(() => undefined);
    }
    return NextResponse.json({
      message: "Refund request submitted. We will email you once it has been reviewed.",
      refund: { id: refund.id, status: refund.status },
    });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json(
        { message: error.message, field: error.field },
        { status: error.status },
      );
    }
    return NextResponse.json({ message: "Could not submit that refund request." }, { status: 500 });
  }
}
