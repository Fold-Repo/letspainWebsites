import { AdminUsersManager } from "@/components/AdminUsersManager";
import { requirePageCapability } from "@/lib/admin-session";
import { listAdminsPublic } from "@/lib/admins";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await requirePageCapability("settings");
  const admins = await listAdminsPublic();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="admin-page-title">Users</h2>
        <p className="mt-1 text-sm text-ink/55">
          Create, update, and remove admin accounts. The seeded first user from{" "}
          <code className="text-xs">ADMIN_EMAIL</code> cannot be deleted.
        </p>
      </div>

      <section className="admin-card p-5 sm:p-7">
        <AdminUsersManager initial={admins} selfEmail={admin.email} />
      </section>
    </div>
  );
}
