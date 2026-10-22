import { CheckInPanel } from "@/components/CheckInPanel";
import { requirePageCapability } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  await requirePageCapability("check_in");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="admin-page-title">Check-in</h2>
        <p className="mt-1 text-sm text-ink/55">
          Enter the booking code from the QR ticket. Paid and free tickets can be admitted once.
        </p>
      </div>
      <div className="admin-card p-5 sm:p-7">
        <CheckInPanel />
      </div>
    </div>
  );
}
