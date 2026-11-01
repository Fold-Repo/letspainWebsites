import type { Metadata } from "next";
import Link from "next/link";
import { RefundRequestForm } from "@/components/RefundRequestForm";
import { supportEmail } from "@/lib/event";

export const metadata: Metadata = { title: "Request a refund" };

export default function RefundPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-5 py-14 md:grid-cols-2">
      <div>
        <p className="text-xs tracking-[0.18em] text-burgundy uppercase">Refunds</p>
        <h1 className="mt-3 font-display text-5xl">Request a refund</h1>
        <p className="mt-4 text-ink/75 leading-relaxed">
          Enter your booking reference to preview the reservation, then confirm. Requests are reviewed
          by our team before any Stripe refund is started.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-ink/70">
          <li>Paid bookings only — free places have nothing to refund.</li>
          <li>
            If you were checked in at the hangout, online refunds are closed. Email{" "}
            <a className="text-burgundy" href={`mailto:${supportEmail()}`}>
              {supportEmail()}
            </a>{" "}
            instead.
          </li>
          <li>
            Still unsure?{" "}
            <Link className="text-burgundy" href="/contact">
              Contact us
            </Link>
            .
          </li>
        </ul>
      </div>
      <RefundRequestForm />
    </div>
  );
}
