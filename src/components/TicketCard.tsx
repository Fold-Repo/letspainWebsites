import type { Booking } from "@/lib/bookings";
import type { Hangout } from "@/lib/events";
import type { BookingItem } from "@/lib/ticket-categories";
import { ticketFacts } from "@/lib/ticket";

export function TicketCard({
  booking,
  hangout,
  qrDataUrl,
  items = [],
}: {
  booking: Booking;
  hangout: Hangout;
  qrDataUrl: string;
  items?: BookingItem[];
}) {
  const ticket = ticketFacts(booking, hangout);
  return (
    <article className="ticket" aria-label={`Ticket ${ticket.code}`}>
      <div className="ticket-head">
        <p className="text-xs tracking-[0.22em] text-pink uppercase">Let&apos;s All Paints</p>
        <p className="mt-2 font-display text-3xl text-cream">
          {booking.paymentStatus === "paid" || booking.paymentStatus === "free" ? "Entry ticket" : "Reservation voucher"}
        </p>
      </div>
      <div className="px-6 pt-6 pb-2">
        <p className="text-xs tracking-[0.18em] text-burgundy uppercase">
          Admit {ticket.seats === 1 ? "one" : ticket.seats}
        </p>
        <h1 className="mt-2 font-display text-5xl leading-[0.92] text-ink">{ticket.eventName}</h1>
        <p className="mt-3 font-display text-lg text-burgundy">
          {ticket.city} · {ticket.whenLabel}
        </p>
      </div>
      <dl className="mx-6 divide-y divide-pink/70 border-y border-pink">
        <div className="grid grid-cols-[7rem_1fr] gap-3 py-3">
          <dt className="text-xs tracking-[0.12em] text-burgundy uppercase">Guest</dt>
          <dd className="font-display text-lg">{ticket.guest}</dd>
        </div>
        <div className="grid grid-cols-[7rem_1fr] gap-3 py-3">
          <dt className="text-xs tracking-[0.12em] text-burgundy uppercase">Party</dt>
          <dd className="font-display text-lg">
            {ticket.party}
            {items.length > 0 ? (
              <span className="mt-1 block text-sm font-sans text-ink/70">
                {items.map((item) => `${item.quantity} × ${item.categoryName}`).join(" · ")}
              </span>
            ) : null}
          </dd>
        </div>
        <div className="grid grid-cols-[7rem_1fr] gap-3 py-3">
          <dt className="text-xs tracking-[0.12em] text-burgundy uppercase">When</dt>
          <dd>
            <span className="font-display text-lg">{ticket.whenLabel}</span>
            <span className="mt-1 block text-sm text-ink/70">{ticket.time}</span>
          </dd>
        </div>
        <div className="grid grid-cols-[7rem_1fr] gap-3 py-3">
          <dt className="text-xs tracking-[0.12em] text-burgundy uppercase">Where</dt>
          <dd className="font-display text-lg">{ticket.venue}</dd>
        </div>
      </dl>
      <div className="flex flex-col items-center px-6 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt={`QR code for reservation ${ticket.code}`} width={168} height={168} className="rounded-xl border border-pink bg-white" />
        <p className="mt-2 text-xs tracking-[0.14em] text-burgundy uppercase">Scan at the door</p>
      </div>
      <div className="mx-6 border-t-2 border-dashed border-gold" />
      <div className="px-6 py-5">
        <p className="text-[11px] tracking-[0.16em] text-burgundy uppercase">Booking reference</p>
        <p className="mt-1 font-display text-4xl tracking-[0.08em] text-burgundy">{ticket.code}</p>
        <p className="mt-2 text-sm text-ink/80">Sent to {ticket.email}. Keep this voucher on your phone or print it.</p>
      </div>
      <p className="bg-cream px-6 py-4 text-sm leading-relaxed text-ink/80">
        This holds {ticket.party}. {ticket.holdNote} Questions: {ticket.support}
      </p>
    </article>
  );
}
