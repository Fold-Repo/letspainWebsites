import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/admin-session";
import { writeAudit } from "@/lib/audit";
import { BookingError, checkInBooking, getBooking, partySize } from "@/lib/bookings";
import { getEvent } from "@/lib/events";
import { listBookingItems } from "@/lib/ticket-categories";

export async function GET(request: Request) {
  const admin = await requireCapability("check_in");
  if (!admin) return NextResponse.json({ message: "Sign in again." }, { status: 401 });
  const code = new URL(request.url).searchParams.get("code")?.trim().toUpperCase() ?? "";
  if (!code) return NextResponse.json({ message: "Enter a booking code." }, { status: 400 });
  const booking = await getBooking(code);
  if (!booking) return NextResponse.json({ message: "That ticket was not found." }, { status: 404 });
  const hangout = await getEvent(booking.eventSlug);
  const items = await listBookingItems(booking.code);
  return NextResponse.json({
    booking: {
      code: booking.code,
      guest: `${booking.firstName} ${booking.lastName}`,
      email: booking.email,
      party: partySize(booking),
      adults: booking.adults,
      children: booking.children,
      paymentStatus: booking.paymentStatus,
      checkedInAt: booking.checkedInAt,
      amountPence: booking.amountPence,
      eventName: hangout?.name ?? booking.eventSlug,
      items: items.map((item) => ({
        name: item.categoryName,
        quantity: item.quantity,
        seats: item.seats,
      })),
    },
  });
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
    });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Check-in failed." }, { status: 500 });
  }
}
