import { requirePageCapability } from "@/lib/admin-session";
import { listAuditLogs } from "@/lib/audit";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requirePageCapability("audit");
  let logs: Awaited<ReturnType<typeof listAuditLogs>> = [];
  let error = "";
  try {
    logs = await listAuditLogs(200);
  } catch {
    error = "Postgres is not reachable. Start the database, then refresh.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="admin-page-title">Audit log</h2>
        <p className="mt-1 text-sm text-ink/55">Recent admin actions for bookings, events, check-in, MFA, and roles.</p>
      </div>
      {error ? <p className="text-sm text-burgundy">{error}</p> : null}
      <section className="admin-card overflow-hidden">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Target</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="!py-10 text-ink/55">
                    No audit entries yet.
                  </td>
                </tr>
              ) : (
                logs.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap text-ink/60">
                      {new Date(entry.createdAt).toLocaleString("en-GB", { timeZone: "Europe/London" })}
                    </td>
                    <td>{entry.actorEmail}</td>
                    <td className="font-medium">{entry.action}</td>
                    <td>
                      {entry.entityType}
                      {entry.entityId ? <span className="block text-xs text-ink/50">{entry.entityId}</span> : null}
                    </td>
                    <td className="text-ink/70">{entry.detail || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
