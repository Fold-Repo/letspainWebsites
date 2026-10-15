import { getBooking } from "@/lib/bookings";
import { getEvent } from "@/lib/events";
import { ticketEmailHtml } from "@/lib/ticket-email";
import { ticketQrDataUrl } from "@/lib/ticket";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const booking = await getBooking(code);
  if (!booking) {
    return new Response("Voucher not found.", { status: 404 });
  }
  const hangout = await getEvent(booking.eventSlug);
  if (!hangout) {
    return new Response("This hangout is no longer listed.", { status: 404 });
  }
  const qr = await ticketQrDataUrl(booking.code);
  return new Response(ticketEmailHtml(booking, hangout, qr), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
