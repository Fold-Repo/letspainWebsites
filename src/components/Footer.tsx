import Link from "next/link";
import { supportEmail } from "@/lib/event";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H7v3h3v7h3v-7h3.1l.9-3H13v-2c0-.6.4-1 1-1Z" />
    </svg>
  );
}

export type FooterSocialLinks = {
  instagram: string;
  facebook: string;
};

export function Footer({ social }: { social: FooterSocialLinks }) {
  const instagramHref = social.instagram?.trim() || "#";
  const facebookHref = social.facebook?.trim() || "#";

  return (
    <footer className="border-t border-burgundy/10 bg-ink text-cream">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl">Let&apos;s All Paints</p>
          <p className="mt-2 max-w-xs text-sm text-cream/75">
            Creative moments. Great company. Lasting memories. First hangout: Eat, Drink &amp; Paint,
            Leicester, May 2027.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <a
              href={instagramHref}
              aria-label="Instagram"
              {...(instagramHref !== "#"
                ? { rel: "noopener noreferrer", target: "_blank" }
                : {})}
              className="inline-flex size-10 items-center justify-center rounded-full border border-cream/20 text-cream/85 transition hover:border-gold hover:text-gold"
            >
              <InstagramIcon className="size-5" />
            </a>
            <a
              href={facebookHref}
              aria-label="Facebook"
              {...(facebookHref !== "#"
                ? { rel: "noopener noreferrer", target: "_blank" }
                : {})}
              className="inline-flex size-10 items-center justify-center rounded-full border border-cream/20 text-cream/85 transition hover:border-gold hover:text-gold"
            >
              <FacebookIcon className="size-5" />
            </a>
          </div>
        </div>
        <div className="text-sm">
          <p className="text-xs tracking-[0.16em] text-gold uppercase">Visit</p>
          <ul className="mt-3 space-y-2 text-cream/80">
            <li>
              <Link href="/events">Hangouts</Link>
            </li>
            <li>
              <Link href="/about">About</Link>
            </li>
            <li>
              <Link href="/contact">Contact</Link>
            </li>
            <li>
              <Link href="/partnerships">Partner</Link>
            </li>
            <li>
              <Link href="/privacy">Privacy &amp; cookies</Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="text-xs tracking-[0.16em] text-gold uppercase">Write</p>
          <a className="mt-3 block text-cream/80" href={`mailto:${supportEmail()}`}>
            {supportEmail()}
          </a>
        </div>
      </div>
    </footer>
  );
}
