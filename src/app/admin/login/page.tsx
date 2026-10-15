import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { ADMIN_COOKIE, readSessionToken } from "@/lib/admin-session";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const jar = await cookies();
  if (readSessionToken(jar.get(ADMIN_COOKIE)?.value)) redirect("/admin");
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <p className="text-xs tracking-[0.18em] text-burgundy uppercase">Admin</p>
      <h1 className="mt-3 font-display text-5xl">Sign in</h1>
      <p className="mt-3 text-ink/70">View reservations and email a Stripe payment link.</p>
      <section className="mt-8 rounded-[1.6rem] bg-white p-6">
        <AdminLoginForm />
      </section>
    </div>
  );
}
