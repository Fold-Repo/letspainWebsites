"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CookieBanner } from "@/components/CookieBanner";
import { Footer, type FooterSocialLinks } from "@/components/Footer";
import { Header } from "@/components/Header";

export function SiteChrome({
  children,
  social,
}: {
  children: ReactNode;
  social: FooterSocialLinks;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main id="content">{children}</main>
      <Footer social={social} />
      <CookieBanner />
    </>
  );
}
