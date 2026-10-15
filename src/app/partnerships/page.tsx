import type { Metadata } from "next";
import { PartnershipForm } from "@/components/PartnershipForm";
import { supportEmail } from "@/lib/event";

export const metadata: Metadata = {
  title: "Partnerships",
  description: "Enquire about sponsoring, vending, performing, or supporting a Let's All Paints hangout.",
};

export default function PartnershipsPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-5 py-14 md:grid-cols-[0.85fr_1.15fr]">
      <div>
        <p className="text-xs tracking-[0.18em] text-burgundy uppercase">Partnerships</p>
        <h1 className="mt-3 font-display text-5xl leading-[0.95]">Work with the hangout</h1>
        <p className="mt-4 leading-relaxed text-ink/75">
          Sponsors, vendors, artists and community groups can write to us here. Tell us who you are
          and what you would like to bring to the day.
        </p>
        <a className="mt-6 inline-block text-burgundy" href={`mailto:${supportEmail()}`}>
          {supportEmail()}
        </a>
      </div>
      <section className="rounded-[1.6rem] bg-white p-5 sm:p-8">
        <PartnershipForm />
      </section>
    </div>
  );
}
