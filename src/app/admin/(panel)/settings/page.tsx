import { AdminTeamPanel } from "@/components/AdminTeamPanel";
import { MfaSetupForm } from "@/components/MfaSetupForm";
import { requirePageCapability } from "@/lib/admin-session";
import { getAdminByEmail, listAdmins } from "@/lib/admins";
import { roleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await requirePageCapability("settings");
  const record = await getAdminByEmail(admin.email);
  const admins = await listAdmins();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="admin-page-title">Settings</h2>
        <p className="mt-1 text-sm text-ink/55">
          Signed in as {admin.email} ({roleLabel(admin.role)}). MFA and team access.
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
        <h3 className="text-lg font-semibold text-ink">Team</h3>
        <p className="mt-2 text-sm text-ink/60">
          Owner: full access. Editor: events, bookings, partnerships, check-in. Door: check-in only. The first owner is
          seeded from <code className="text-xs">ADMIN_EMAIL</code> / <code className="text-xs">ADMIN_PASSWORD</code> on
          startup.
        </p>
        <div className="mt-6">
          <AdminTeamPanel
            selfEmail={admin.email}
            initial={admins.map((row) => ({
              email: row.email,
              role: row.role,
              mfaEnabled: row.mfaEnabled,
            }))}
          />
        </div>
      </section>
    </div>
  );
}
