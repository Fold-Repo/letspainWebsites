import { AdminRolesForm } from "@/components/AdminRolesForm";
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
    <div className="mx-auto max-w-3xl space-y-10 px-5 py-10">
      <div>
        <p className="text-xs tracking-[0.18em] text-burgundy uppercase">Security</p>
        <h1 className="mt-2 font-display text-5xl">Settings</h1>
        <p className="mt-3 text-ink/70">
          Signed in as {admin.email} ({roleLabel(admin.role)}). Turn on authenticator MFA and manage team roles.
        </p>
      </div>

      <section className="rounded-[1.4rem] bg-white p-5 sm:p-8">
        <h2 className="font-display text-3xl">Authenticator MFA</h2>
        <p className="mt-2 text-sm text-ink/70">
          Scan the QR code with Google Authenticator, 1Password, or Authy. After it is enabled, every sign-in needs a
          6-digit code.
        </p>
        <div className="mt-6">
          <MfaSetupForm initiallyEnabled={Boolean(record?.mfaEnabled)} />
        </div>
      </section>

      <section className="rounded-[1.4rem] bg-cream/50 p-5 sm:p-8">
        <h2 className="font-display text-3xl">Team roles</h2>
        <p className="mt-2 text-sm text-ink/70">
          Owner: full access. Editor: events, bookings, partnerships, check-in. Door: check-in only. Extra accounts are
          created by inserting into the <code className="text-xs">admins</code> table; change their role here.
        </p>
        <div className="mt-6">
          <AdminRolesForm
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
