import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";
import { supportEmail } from "@/lib/event";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-5 py-14 md:grid-cols-2">
      <div>
        <p className="text-xs tracking-[0.18em] text-burgundy uppercase">Contact</p>
        <h1 className="mt-3 font-display text-5xl">Ask us about the hangout</h1>
        <p className="mt-4 text-ink/75 leading-relaxed">
          Questions about access, group size, or the Leicester day can come here. If you already
          reserved, include your booking reference.
        </p>
        <a className="mt-6 inline-block text-burgundy" href={`mailto:${supportEmail()}`}>
          {supportEmail()}
        </a>
        <p className="mt-6 text-sm text-ink/70">
          For sponsorship, vending, or community collaboration, use the{" "}
          <Link className="text-burgundy" href="/partnerships">
            partnership enquiry
          </Link>
          .
        </p>
      </div>
      <section className="rounded-[1.6rem] bg-white p-5 sm:p-8">
        <ContactForm />
      </section>
    </div>
  );
}
