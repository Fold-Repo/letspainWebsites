import Image from "next/image";
import Link from "next/link";
import { supportEmail } from "@/lib/event";

const links = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Hangouts" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/partnerships", label: "Partner" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-burgundy/8 bg-white/90 backdrop-blur-md">
      <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-3 md:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="justify-self-start">
          <Image
            src="/logo.jpg"
            alt="Let's All Paints"
            width={280}
            height={280}
            priority
            className="h-12 w-auto rounded-full object-cover shadow-sm md:h-14"
            style={{ width: "auto" }}
          />
        </Link>
        <nav className="hidden items-center justify-center gap-7 text-sm text-ink/75 md:flex" aria-label="Primary">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-burgundy">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-end gap-3">
          <a
            href={`mailto:${supportEmail()}`}
            className="hidden text-sm text-ink/55 xl:inline hover:text-burgundy"
          >
            {supportEmail()}
          </a>
          <Link
            href="/book"
            className="rounded-full bg-burgundy px-4 py-2.5 text-xs font-semibold tracking-[0.06em] text-cream uppercase transition hover:bg-burgundy/90"
          >
            Enrol
          </Link>
        </div>
      </div>
      <nav
        className="flex gap-4 overflow-x-auto border-t border-burgundy/5 px-5 py-2.5 text-sm text-ink/75 md:hidden"
        aria-label="Mobile"
      >
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="shrink-0 hover:text-burgundy">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
