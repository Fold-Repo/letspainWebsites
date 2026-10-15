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
    <div className="mx-auto max-w-5xl px-5 py-10">
      <p className="text-xs tracking-[0.18em] text-burgundy uppercase">Inbox</p>
      <h1 className="mt-2 font-display text-5xl">Partnership enquiries</h1>
      <p className="mt-3 text-ink/70">
        {enquiries.length} {enquiries.length === 1 ? "enquiry" : "enquiries"}
      </p>
      {error ? <p className="mt-6 rounded-2xl bg-pink/40 px-4 py-3">{error}</p> : null}
      {!error && enquiries.length === 0 ? <p className="mt-8 text-ink/70">No partnership enquiries yet.</p> : null}
      <div className="mt-8 space-y-4">
        {enquiries.map((enquiry) => (
          <article key={enquiry.id} className="rounded-[1.4rem] bg-white p-5">
            <p className="text-xs tracking-[0.14em] text-burgundy uppercase">
              {categoryLabel(enquiry.category)} · {new Date(enquiry.createdAt).toLocaleString("en-GB")}
            </p>
            <h2 className="mt-2 font-display text-3xl">{enquiry.organisation}</h2>
            <p className="mt-1 text-sm">
              {enquiry.name} · <a className="text-burgundy" href={`mailto:${enquiry.email}`}>{enquiry.email}</a>
              {enquiry.phone ? ` · ${enquiry.phone}` : ""}
            </p>
            {enquiry.website ? (
              <p className="mt-2 text-sm">
                <a className="break-all text-burgundy" href={enquiry.website}>
                  {enquiry.website}
                </a>
              </p>
            ) : null}
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{enquiry.message}</p>
            <p className="mt-3 text-xs text-ink/50">{inboxLabel(enquiry)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
