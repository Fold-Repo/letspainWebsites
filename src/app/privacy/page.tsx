import type { Metadata } from "next";
import { supportEmail } from "@/lib/event";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="font-display text-5xl">Privacy</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-ink/80">
        <p>
          This is a working notice for reservations while Let&apos;s All Paints is in planning. A
          fuller privacy notice will replace it before public ticket sales.
        </p>
        <p>
          If you reserve, we keep the lead booker&apos;s name, email, optional phone, party size,
          optional notes, and whether you asked for news. We use that to hold your places, send the
          voucher, and contact you about the day, venue and price.
        </p>
        <p>
          Card payments are taken on Stripe&apos;s page. We keep the amount and whether it was paid.
          We never see or store the card number.
        </p>
        <p>
          Marketing email is only sent if you tick the news box. You can ask us to delete a
          reservation or stop news by writing to {supportEmail()}.
        </p>
        <p>Messages sent through the contact form are kept so we can reply.</p>
        <p>
          Partnership enquiries keep your name, organisation, email, optional phone, category,
          message, and optional website so we can reply. They are also emailed to the organiser inbox.
        </p>
      </div>
    </article>
  );
}
