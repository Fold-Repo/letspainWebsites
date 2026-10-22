import Link from "next/link";
import { AdminTrendChart } from "@/components/AdminTrendChart";
import { getDashboardSummary } from "@/lib/admin-dashboard";
import { requirePageCapability } from "@/lib/admin-session";
import { formatGbp } from "@/lib/money";

export const dynamic = "force-dynamic";

function statusLabel(status: string, checkedIn: boolean) {
  if (checkedIn) return "Checked in";
  if (status === "paid") return "Paid";
  if (status === "free") return "Free";
  if (status === "link_sent") return "Link sent";
  return "Unpaid";
}

function statusBadge(status: string, checkedIn: boolean) {
  if (checkedIn) return "admin-badge admin-badge-in";
  if (status === "paid") return "admin-badge admin-badge-paid";
  if (status === "free") return "admin-badge admin-badge-free";
  if (status === "link_sent") return "admin-badge admin-badge-link";
  return "admin-badge admin-badge-unpaid";
}

export default async function AdminDashboardPage() {
  await requirePageCapability("bookings");

  let error = "";
  let summary: Awaited<ReturnType<typeof getDashboardSummary>> | null = null;
  try {
    summary = await getDashboardSummary();
  } catch {
    error = "Postgres is not reachable. Start the database, then refresh.";
  }

  const metrics = summary
    ? [
        {
          label: "Enrolments",
          value: String(summary.enrolments),
          hint: `${summary.seats} seats reserved`,
          icon: "◎",
          tone: "bg-burgundy/10 text-burgundy",
        },
        {
          label: "Paid revenue",
          value: summary.paidRevenuePence ? formatGbp(summary.paidRevenuePence) : "£0",
          hint: `${summary.paid} paid booking${summary.paid === 1 ? "" : "s"}`,
          icon: "£",
          tone: "bg-[color-mix(in_srgb,#1f7a4d_14%,white)] text-[#1f7a4d]",
        },
        {
          label: "Awaiting payment",
          value: String(summary.unpaid),
          hint: "Unpaid or link sent",
          icon: "…",
          tone: "bg-gold/25 text-[#8a5a12]",
        },
        {
          label: "Checked in",
          value: String(summary.checkedIn),
          hint: summary.enrolments
            ? `${Math.round((summary.checkedIn / summary.enrolments) * 100)}% of enrolments`
            : "No check-ins yet",
          icon: "✓",
          tone: "bg-pink/40 text-burgundy",
        },
        {
          label: "Hangouts open",
          value: String(summary.eventsOpen),
          hint: `${summary.eventsPublished} published · ${summary.eventsTotal} total`,
          icon: "◌",
          tone: "bg-burgundy/10 text-burgundy",
        },
        {
          label: "Partnerships",
          value: String(summary.partnerships),
          hint: "Partner enquiries on file",
          icon: "◇",
          tone: "bg-gold/20 text-[#8a5a12]",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="admin-page-title">Dashboard</h2>
          <p className="mt-1 text-sm text-ink/55">A quick look at enrolments, revenue, and what’s open.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/reservations" className="admin-chip">
            Reservations
          </Link>
          <Link href="/admin/check-in" className="admin-chip">
            Check-in
          </Link>
        </div>
      </div>

      {error ? <p className="rounded-2xl bg-pink/40 px-4 py-3 text-sm">{error}</p> : null}

      {summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => (
              <article key={metric.label} className="admin-card admin-metric">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="admin-metric-label">{metric.label}</p>
                    <p className="admin-metric-value">{metric.value}</p>
                  </div>
                  <span className={`admin-metric-icon ${metric.tone}`}>{metric.icon}</span>
                </div>
                <p className="mt-2 text-xs text-ink/45">{metric.hint}</p>
              </article>
            ))}
          </div>

          <section className="admin-card overflow-hidden p-0">
            <AdminTrendChart days={summary.trend} />
          </section>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="admin-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-burgundy/10 px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold text-ink">Latest enrolments</h3>
                  <p className="text-sm text-ink/50">Most recent bookings across hangouts.</p>
                </div>
                <Link href="/admin/reservations" className="text-sm font-semibold text-burgundy">
                  View all →
                </Link>
              </div>
              {summary.recent.length === 0 ? (
                <p className="px-5 py-10 text-sm text-ink/60">No enrolments yet.</p>
              ) : (
                <ul className="divide-y divide-burgundy/8">
                  {summary.recent.map((booking) => (
                    <li key={booking.code} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">
                          {booking.firstName} {booking.lastName}
                        </p>
                        <p className="truncate text-xs text-ink/50">
                          {booking.eventSlug} · {booking.code}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={statusBadge(booking.paymentStatus, Boolean(booking.checkedInAt))}>
                          {statusLabel(booking.paymentStatus, Boolean(booking.checkedInAt))}
                        </span>
                        <p className="mt-1 text-[11px] text-ink/45">
                          {new Date(booking.createdAt).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="admin-card p-5 sm:p-6">
              <h3 className="text-base font-semibold text-ink">Shortcuts</h3>
              <p className="mt-1 text-sm text-ink/50">Jump into the work that needs attention.</p>
              <ul className="mt-5 space-y-2">
                {[
                  { href: "/admin/events/new", label: "Create hangout", hint: "New event wizard" },
                  { href: "/admin/reservations", label: "Manage payments", hint: "Send Stripe links" },
                  { href: "/admin/check-in", label: "Door check-in", hint: "Scan or enter codes" },
                  { href: "/admin/users", label: "Team users", hint: "Roles and access" },
                ].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center justify-between gap-3 rounded-xl border border-burgundy/10 bg-cream/50 px-4 py-3 transition hover:border-burgundy/25 hover:bg-white"
                    >
                      <span>
                        <span className="block text-sm font-semibold text-ink">{item.label}</span>
                        <span className="text-xs text-ink/50">{item.hint}</span>
                      </span>
                      <span className="text-burgundy" aria-hidden>
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
