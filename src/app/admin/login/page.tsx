import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { ADMIN_COOKIE, homePathForRole, readSessionToken } from "@/lib/admin-session";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const jar = await cookies();
  const session = readSessionToken(jar.get(ADMIN_COOKIE)?.value);
  if (session) redirect(homePathForRole(session.role));
  return (
    <div className="admin-app flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-burgundy/10">
            <Image src="/logo.jpg" alt="" fill className="object-cover" sizes="48px" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Let&apos;s All Paints</p>
            <p className="text-xs text-ink/50">Back office sign in</p>
          </div>
        </div>
        <section className="admin-card p-6 sm:p-8">
          <h1 className="admin-page-title">Sign in</h1>
          <p className="mt-2 text-sm text-ink/60">Manage hangouts, reservations, partnerships, and door check-in.</p>
          <div className="mt-6">
            <AdminLoginForm />
          </div>
        </section>
        <p className="mt-5 text-center text-sm text-ink/50">
          <Link href="/" className="text-burgundy">
            ← Back to the site
          </Link>
        </p>
      </div>
    </div>
  );
}
