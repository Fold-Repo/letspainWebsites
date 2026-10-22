import { requirePageCapability } from "@/lib/admin-session";
import { categoryLabel, listPartnerships, type Partnership } from "@/lib/partnerships";

export const dynamic = "force-dynamic";

function inboxLabel(enquiry: Partnership) {
  if (enquiry.emailStatus === "sent") return "Sent to the admin inbox";
  if (enquiry.emailStatus === "failed") return "Saved here. The inbox email failed.";
  if (enquiry.emailStatus === "unconfigured") return "Saved here. Inbox email is not configured yet.";
  return "Saved";
}

export default async function PartnershipsAdminPage() {
  await requirePageCapability("partnerships");
  let enquiries: Partnership[] = [];
  let error = "";
  try {
    enquiries = await listPartnerships();
  } catch {
    error = "Postgres is not reachable. Start the database, then refresh.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="admin-page-title">Partnerships</h2>
        <p className="mt-1 text-sm text-ink/55">
          {enquiries.length} {enquiries.length === 1 ? "enquiry" : "enquiries"} from the public form.
        </p>
      </div>
      {error ? <p className="rounded-2xl bg-pink/40 px-4 py-3 text-sm">{error}</p> : null}
      {!error && enquiries.length === 0 ? (
        <div className="admin-card px-5 py-12 text-center text-sm text-ink/60">No partnership enquiries yet.</div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {enquiries.map((enquiry) => (
          <article key={enquiry.id} className="admin-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="admin-badge admin-badge-link">{categoryLabel(enquiry.category)}</span>
              <span className="text-xs text-ink/45">{new Date(enquiry.createdAt).toLocaleString("en-GB")}</span>
            </div>
            <h3 className="mt-3 text-xl font-semibold text-ink">{enquiry.organisation}</h3>
            <p className="mt-1 text-sm text-ink/70">
              {enquiry.name} ·{" "}
              <a className="text-burgundy" href={`mailto:${enquiry.email}`}>
                {enquiry.email}
              </a>
              {enquiry.phone ? ` · ${enquiry.phone}` : ""}
            </p>
            {enquiry.website ? (
              <p className="mt-2 text-sm">
                <a className="break-all text-burgundy" href={enquiry.website}>
                  {enquiry.website}
                </a>
              </p>
            ) : null}
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/75">{enquiry.message}</p>
            <p className="mt-3 text-xs text-ink/45">{inboxLabel(enquiry)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
