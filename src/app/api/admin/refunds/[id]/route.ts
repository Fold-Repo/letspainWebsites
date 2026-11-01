import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/admin-session";
import { writeAudit } from "@/lib/audit";
import { BookingError, getBooking } from "@/lib/bookings";
import {
  sendRefundProcessingEmail,
  sendRefundRejectedEmail,
} from "@/lib/email";
import {
  approveRefundRequest,
  getRefundRequest,
  markBookingRefunded,
  refundEligibility,
  rejectRefundRequest,
} from "@/lib/refunds";
import { refundCheckoutSession, stripeConfigured } from "@/lib/stripe";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const admin = await requireCapability("bookings");
  if (!admin) return NextResponse.json({ message: "Sign in again." }, { status: 401 });
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ message: "Invalid refund request." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as {
      decision?: string;
      rejectionReason?: string;
    };
    const decision = String(body.decision ?? "").toLowerCase();
    const refund = await getRefundRequest(id);
    if (!refund || refund.status !== "pending") {
      return NextResponse.json({ message: "That refund request is no longer pending." }, { status: 409 });
    }

    const booking = await getBooking(refund.bookingCode);
    if (!booking) {
      return NextResponse.json({ message: "Booking not found." }, { status: 404 });
    }

    if (decision === "reject") {
      const rejected = await rejectRefundRequest(id, admin.email, String(body.rejectionReason ?? ""));
      if (!rejected) {
        return NextResponse.json({ message: "That refund request is no longer pending." }, { status: 409 });
      }
      await sendRefundRejectedEmail(booking, rejected.rejectionReason).catch(() => undefined);
      await writeAudit({
        actorEmail: admin.email,
        action: "refund_reject",
        entityType: "refund_request",
        entityId: String(id),
        detail: rejected.rejectionReason,
      });
      return NextResponse.json({
        message: "Refund request rejected. The guest has been emailed.",
        refund: rejected,
      });
    }

    if (decision !== "approve") {
      return NextResponse.json({ message: "Choose approve or reject." }, { status: 400 });
    }

    const eligibility = refundEligibility(booking, null);
    if (booking.checkedInAt) {
      return NextResponse.json(
        {
          message:
            "This guest was checked in at the hangout. Reject the request or resolve it offline — Stripe refund was not started.",
        },
        { status: 409 },
      );
    }
    if (booking.paymentStatus !== "paid" || !booking.stripeSessionId) {
      return NextResponse.json(
        { message: eligibility.blockReason ?? "This booking cannot be refunded through Stripe." },
        { status: 409 },
      );
    }
    if (!stripeConfigured()) {
      return NextResponse.json({ message: "Stripe is not configured on this server." }, { status: 503 });
    }

    const stripeRefund = await refundCheckoutSession(booking.stripeSessionId);
    const approved = await approveRefundRequest(id, admin.email, stripeRefund.id);
    if (!approved) {
      return NextResponse.json(
        {
          message:
            "Stripe refund may have started, but the request was no longer pending. Check Stripe and refresh.",
        },
        { status: 409 },
      );
    }
    await markBookingRefunded(booking.code);
    await sendRefundProcessingEmail(booking).catch(() => undefined);
    await writeAudit({
      actorEmail: admin.email,
      action: "refund_approve",
      entityType: "refund_request",
      entityId: String(id),
      detail: `stripe:${stripeRefund.id}`,
    });

    return NextResponse.json({
      message: "Refund approved. Stripe has been instructed and the guest has been emailed.",
      refund: approved,
    });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json(
        { message: error.message, field: error.field },
        { status: error.status },
      );
    }
    const message = error instanceof Error ? error.message : "Could not process that refund.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
