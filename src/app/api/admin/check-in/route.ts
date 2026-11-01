import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/admin-session";
import { writeAudit } from "@/lib/audit";
import {
  BookingError,
  checkInBooking,
  getBooking,
  partySize,
  undoCheckInBooking,
} from "@/lib/bookings";
import { getEvent } from "@/lib/events";
import { listBookingItems } from "@/lib/ticket-categories";

async function bookingPayload(code: string) {
  const booking = await getBooking(code);
  if (!booking) return null;
  const hangout = await getEvent(booking.eventSlug);
  const items = await listBookingItems(booking.code);
  return {
    code: booking.code,
    guest: `${booking.firstName} ${booking.lastName}`,
    email: booking.email,
    party: partySize(booking),
    adults: booking.adults,
    children: booking.children,
    paymentStatus: booking.paymentStatus,
    checkedInAt: booking.checkedInAt,
    checkedInBy: booking.checkedInBy,
    amountPence: booking.amountPence,
    eventName: hangout?.name ?? booking.eventSlug,
    items: items.map((item) => ({
      name: item.categoryName,
      quantity: item.quantity,
      seats: item.seats,
    })),
  };
}

export async function GET(request: Request) {
  const admin = await requireCapability("check_in");
  if (!admin) return NextResponse.json({ message: "Sign in again." }, { status: 401 });
  const code = new URL(request.url).searchParams.get("code")?.trim().toUpperCase() ?? "";
  if (!code) return NextResponse.json({ message: "Enter a booking code." }, { status: 400 });
  const booking = await bookingPayload(code);
  if (!booking) return NextResponse.json({ message: "That ticket was not found." }, { status: 404 });
  return NextResponse.json({ booking });
}

export async function POST(request: Request) {
  const admin = await requireCapability("check_in");
  if (!admin) return NextResponse.json({ message: "Sign in again." }, { status: 401 });
  let body: { code?: string };
  try {
    body = (await request.json()) as { code?: string };
  } catch {
    body = {};
  }
  try {
    const booking = await checkInBooking(String(body.code ?? ""), admin.email);
    await writeAudit({
      actorEmail: admin.email,
      action: "check_in",
      entityType: "booking",
      entityId: booking.code,
      detail: `${booking.firstName} ${booking.lastName}`,
    });
    return NextResponse.json({
      ok: true,
      message: `Checked in ${booking.firstName} ${booking.lastName}.`,
      checkedInAt: booking.checkedInAt,
      checkedInBy: booking.checkedInBy,
    });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Check-in failed." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await requireCapability("check_in");
  if (!admin) return NextResponse.json({ message: "Sign in again." }, { status: 401 });
  let body: { code?: string };
  try {
    body = (await request.json()) as { code?: string };
  } catch {
    body = {};
  }
  try {
    const booking = await undoCheckInBooking(String(body.code ?? ""));
    await writeAudit({
      actorEmail: admin.email,
      action: "check_in_undo",
      entityType: "booking",
      entityId: booking.code,
      detail: `${booking.firstName} ${booking.lastName}`,
    });
    const payload = await bookingPayload(booking.code);
    return NextResponse.json({
      ok: true,
      message: `Cleared check-in for ${booking.firstName} ${booking.lastName}.`,
      booking: payload,
    });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Could not undo check-in." }, { status: 500 });
  }
}
