import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { TicketCard } from "@/components/TicketCard";
import { getBooking } from "@/lib/bookings";
import { getEvent } from "@/lib/events";
import { supportEmail } from "@/lib/event";
import { listBookingItems } from "@/lib/ticket-categories";
import { formatGbp } from "@/lib/money";
import { confirmCheckoutSession } from "@/lib/stripe";
import { ticketQrDataUrl } from "@/lib/ticket";

export const metadata: Metadata = { title: "Your voucher" };

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { code } = await params;
  const query = await searchParams;
  if (query.session_id) await confirmCheckoutSession(code, query.session_id);
  const booking = await getBooking(code);
  if (!booking) notFound();
  const hangout = await getEvent(booking.eventSlug);
  if (!hangout) notFound();
  const items = await listBookingItems(booking.code);
  const qrDataUrl = await ticketQrDataUrl(booking.code);
  const note =
    booking.paymentStatus === "paid"
      ? `Payment received${booking.amountPence ? ` · ${formatGbp(booking.amountPence)}` : ""}. Your places are confirmed.`
      : booking.emailStatus === "sent"
        ? `We emailed the voucher to ${booking.email}. It is also here if you want to print it.`
        : booking.emailStatus === "failed"
          ? `Your places are reserved, but the email did not send. Keep this page or print it, and write to ${supportEmail()} if you need another copy.`
          : `Your places are reserved. Mail is not connected yet, so the voucher is on this page. We will use ${booking.email} when it is.`;

  return (
    <div className="mx-auto max-w-xl px-5 py-14">
      <p className="text-center text-xs tracking-[0.18em] text-burgundy uppercase">You are on the list</p>
      <h1 className="mt-3 text-center font-display text-4xl">Your voucher is ready</h1>
      <p className="no-print mt-3 text-center text-ink/75">{note}</p>
      <div className="mt-8">
        <TicketCard booking={booking} hangout={hangout} qrDataUrl={qrDataUrl} items={items} />
      </div>
      <div className="no-print mt-6 flex flex-wrap justify-center gap-3 text-sm">
        {booking.checkoutUrl && booking.paymentStatus !== "paid" ? (
          <a href={booking.checkoutUrl} className="rounded-full bg-burgundy px-4 py-2 text-cream">
            Pay now
          </a>
        ) : null}
        <PrintButton />
        <Link
          href={`/book/confirmation/${booking.code}/email`}
          className="rounded-full border border-burgundy px-4 py-2 text-burgundy"
        >
          Open the email version
        </Link>
      </div>
    </div>
  );
}
