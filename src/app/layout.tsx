import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { SiteChrome } from "@/components/SiteChrome";
import { publicSiteUrl } from "@/lib/event";
import { getSocialSettings } from "@/lib/site-settings";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const siteUrl = publicSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Let's All Paints",
    template: "%s · Let's All Paints",
  },
  description:
    "Eat, Drink & Paint is a painting hangout in Leicester, May 2027. Reserve a place and receive a voucher by email.",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: siteUrl,
    siteName: "Let's All Paints",
    title: "Let's All Paints",
    description:
      "Eat, Drink & Paint — Leicester, May 2027. Enrol for tickets and receive your voucher by email.",
    images: [{ url: "/logo.jpg", width: 512, height: 512, alt: "Let's All Paints" }],
  },
  twitter: {
    card: "summary",
    title: "Let's All Paints",
    description: "Eat, Drink & Paint — Leicester, May 2027.",
    images: ["/logo.jpg"],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let social: Awaited<ReturnType<typeof getSocialSettings>> = {
    instagram: "#",
    facebook: "#",
  };
  // Defensive: never let footer settings take down the whole site during DB blips.
  try {
    social = await getSocialSettings();
  } catch {
    social = { instagram: "#", facebook: "#" };
  }

  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${outfit.variable} antialiased`}>
        <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-white focus:px-3 focus:py-2">
          Skip to content
        </a>
        <SiteChrome social={social}>{children}</SiteChrome>
      </body>
    </html>
  );
}
