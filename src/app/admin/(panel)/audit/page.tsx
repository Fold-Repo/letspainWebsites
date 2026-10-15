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
    <div className="mx-auto max-w-5xl px-5 py-10">
      <p className="text-xs tracking-[0.18em] text-burgundy uppercase">Compliance</p>
      <h1 className="mt-2 font-display text-5xl">Audit log</h1>
      <p className="mt-3 text-ink/70">Recent admin actions for bookings, events, check-in, MFA, and roles.</p>
      {error ? <p className="mt-6 text-burgundy">{error}</p> : null}
      <div className="mt-8 overflow-x-auto rounded-[1.4rem] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-burgundy/10 text-xs tracking-wide text-ink/55 uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Who</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-ink/55">
                  No audit entries yet.
                </td>
              </tr>
            ) : (
              logs.map((entry) => (
                <tr key={entry.id} className="border-t border-burgundy/5 align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-ink/60">
                    {new Date(entry.createdAt).toLocaleString("en-GB", { timeZone: "Europe/London" })}
                  </td>
                  <td className="px-4 py-3">{entry.actorEmail}</td>
                  <td className="px-4 py-3 font-medium">{entry.action}</td>
                  <td className="px-4 py-3">
                    {entry.entityType}
                    {entry.entityId ? (
                      <span className="block text-xs text-ink/50">{entry.entityId}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-ink/70">{entry.detail || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
