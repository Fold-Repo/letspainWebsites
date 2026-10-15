import Image from "next/image";
import Link from "next/link";

const links = [
  { href: "/about", label: "About" },
  { href: "/events", label: "Hangouts" },
  { href: "/contact", label: "Contact" },
  { href: "/partnerships", label: "Partner" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-burgundy/10 bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="shrink-0">
          <Image
            src="/logo.jpg"
            alt="Let's All Paint"
            width={280}
            height={280}
            priority
            className="h-24 w-auto"
            style={{ width: "auto", height: "6rem" }}
          />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-ink/80 md:flex" aria-label="Primary">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-burgundy">
              {link.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/book"
          className="rounded-full bg-burgundy px-4 py-2 text-sm font-medium text-cream hover:bg-burgundy/90"
        >
          Enrol
        </Link>
      </div>
      <nav className="flex gap-4 overflow-x-auto px-5 pb-3 text-sm text-ink/80 md:hidden" aria-label="Mobile">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="shrink-0 hover:text-burgundy">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
