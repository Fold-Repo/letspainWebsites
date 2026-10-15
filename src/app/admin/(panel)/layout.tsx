import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { requireAdmin } from "@/lib/admin-session";

export const metadata: Metadata = {
  title: "Bookings",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  return (
    <div>
      <div className="border-b border-burgundy/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <nav className="flex gap-4 text-sm">
            <Link href="/admin/events" className="text-burgundy">
              Events
            </Link>
            <Link href="/admin" className="text-burgundy">
              Reservations
            </Link>
            <Link href="/admin/partnerships" className="text-burgundy">
              Partnerships
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <p className="text-sm text-ink/70">{admin.email}</p>
            <LogoutButton />
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
