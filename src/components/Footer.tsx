import Link from "next/link";
import { socialLinks, supportEmail } from "@/lib/event";

export function Footer() {
  const social = socialLinks();
  return (
    <footer className="border-t border-burgundy/10 bg-ink text-cream">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl">Let&apos;s All Paints</p>
          <p className="mt-2 max-w-xs text-sm text-cream/75">
            Creative moments. Great company. Lasting memories. First hangout: Eat, Drink &amp; Paint,
            Leicester, May 2027.
          </p>
        </div>
        <div className="text-sm">
          <p className="text-xs tracking-[0.16em] text-gold uppercase">Visit</p>
          <ul className="mt-3 space-y-2 text-cream/80">
            <li>
              <Link href="/events">Hangouts</Link>
            </li>
            <li>
              <Link href="/book">Enrol</Link>
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
          {social.instagram || social.facebook ? (
            <ul className="mt-3 space-y-2 text-cream/80">
              {social.instagram ? (
                <li>
                  <a href={social.instagram} rel="noopener noreferrer" target="_blank">
                    Instagram
                  </a>
                </li>
              ) : null}
              {social.facebook ? (
                <li>
                  <a href={social.facebook} rel="noopener noreferrer" target="_blank">
                    Facebook
                  </a>
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="mt-3 text-cream/60">Instagram and Facebook pages will be linked here soon.</p>
          )}
        </div>
      </div>
    </footer>
  );
}
