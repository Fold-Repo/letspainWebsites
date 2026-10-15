import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { can, requireAdmin } from "@/lib/admin-session";
import { roleLabel } from "@/lib/roles";

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
          <nav className="flex flex-wrap gap-4 text-sm">
            {can(admin.role, "events") ? (
              <Link href="/admin/events" className="text-burgundy">
                Events
              </Link>
            ) : null}
            {can(admin.role, "bookings") ? (
              <Link href="/admin" className="text-burgundy">
                Reservations
              </Link>
            ) : null}
            {can(admin.role, "partnerships") ? (
              <Link href="/admin/partnerships" className="text-burgundy">
                Partnerships
              </Link>
            ) : null}
            {can(admin.role, "check_in") ? (
              <Link href="/admin/check-in" className="text-burgundy">
                Check-in
              </Link>
            ) : null}
            {can(admin.role, "settings") ? (
              <Link href="/admin/settings" className="text-burgundy">
                Settings
              </Link>
            ) : null}
            {can(admin.role, "audit") ? (
              <Link href="/admin/audit" className="text-burgundy">
                Audit
              </Link>
            ) : null}
          </nav>
          <div className="flex items-center gap-4">
            <p className="text-sm text-ink/70">
              {admin.email}
              <span className="ml-2 text-ink/45">· {roleLabel(admin.role)}</span>
            </p>
            <LogoutButton />
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
