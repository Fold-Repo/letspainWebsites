import type { Metadata } from "next";
import { supportEmail } from "@/lib/event";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Let's All Paints uses booking, payment, partnership, and cookie data.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="font-display text-5xl">Privacy</h1>
      <p className="mt-3 text-ink/60">Last updated: 15 October 2026</p>
      <div className="mt-6 space-y-4 leading-relaxed text-ink/80">
        <p>
          Let&apos;s All Paints (“we”) runs creative hangouts in the UK. This notice explains what we collect when you
          reserve a place, buy a ticket, write to us, or enquire about a partnership.
        </p>

        <h2 className="pt-4 font-display text-3xl text-ink">Bookings and tickets</h2>
        <p>
          If you reserve or buy tickets, we keep the lead booker&apos;s name, email, optional phone, party size or ticket
          quantities, optional notes, marketing preference, and a booking code. We use that to hold places, send the
          voucher or QR ticket, admit you at the door, and contact you about the day, venue, and price.
        </p>
        <p>
          Card payments run on Stripe&apos;s page. We keep the amount, currency, payment status, and Stripe session id. We
          never see or store the card number.
        </p>

        <h2 className="pt-4 font-display text-3xl text-ink">Messages and partnerships</h2>
        <p>Messages sent through the contact form are kept so we can reply.</p>
        <p>
          Partnership enquiries keep your name, organisation, email, optional phone, category, message, and optional
          website so we can reply. They are also emailed to the organiser inbox.
        </p>

        <h2 className="pt-4 font-display text-3xl text-ink">Cookies and choices</h2>
        <p>
          Essential cookies keep admin sign-in secure and remember your cookie choice. They are required for the site to
          work. Optional analytics cookies are off by default; the banner lets you allow or refuse them. We record the
          choice (essential only, or essential plus analytics) against an anonymous visitor key so we can show we asked.
        </p>
        <p>
          Marketing email is only sent if you tick the news box on a booking. You can ask us to delete a reservation,
          partnership enquiry, or marketing preference by writing to {supportEmail()}.
        </p>

        <h2 className="pt-4 font-display text-3xl text-ink">Admin access</h2>
        <p>
          Organiser accounts use password sign-in, optional authenticator MFA, and role-based access. Admin actions such
          as check-in, payment links, and event edits are written to an audit log for accountability.
        </p>

        <h2 className="pt-4 font-display text-3xl text-ink">How long and where</h2>
        <p>
          Booking and payment records are kept for the hangout and a reasonable period afterwards for refunds, door
          checks, and accounts. Hosting and database location follow the deployment region described in our operations
          notes. Contact {supportEmail()} for access, correction, or deletion requests.
        </p>
      </div>
    </article>
  );
}
