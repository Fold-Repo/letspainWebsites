import Link from "next/link";
import { MfaSetupForm } from "@/components/MfaSetupForm";
import { requirePageCapability } from "@/lib/admin-session";
import { getAdminByEmail } from "@/lib/admins";
import { roleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await requirePageCapability("settings");
  const record = await getAdminByEmail(admin.email);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="admin-page-title">Settings</h2>
        <p className="mt-1 text-sm text-ink/55">
          Signed in as {admin.email} ({roleLabel(admin.role)}). MFA and account security.
        </p>
      </div>

      <section className="admin-card p-5 sm:p-7">
        <h3 className="text-lg font-semibold text-ink">Authenticator MFA</h3>
        <p className="mt-2 text-sm text-ink/60">
          Scan the QR code with Google Authenticator, 1Password, or Authy. After it is enabled, every sign-in needs a
          6-digit code.
        </p>
        <div className="mt-6">
          <MfaSetupForm initiallyEnabled={Boolean(record?.mfaEnabled)} />
        </div>
      </section>

      <section className="admin-card p-5 sm:p-7">
        <h3 className="text-lg font-semibold text-ink">Team access</h3>
        <p className="mt-2 text-sm text-ink/60">
          Create, edit, and remove admin users from the Users page. The seeded first admin cannot be deleted.
        </p>
        <Link href="/admin/users" className="admin-btn-primary mt-5 inline-flex">
          Manage users
        </Link>
      </section>
    </div>
  );
}
