import { CheckInPanel } from "@/components/CheckInPanel";
import { requirePageCapability } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  await requirePageCapability("check_in");
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <p className="text-xs tracking-[0.18em] text-burgundy uppercase">Door</p>
      <h1 className="mt-2 font-display text-5xl">Check-in</h1>
      <p className="mt-3 text-ink/70">
        Enter the booking code from the QR ticket. Paid and free tickets can be admitted once. A second scan is
        blocked.
      </p>
      <div className="mt-8">
        <CheckInPanel />
      </div>
    </div>
  );
}
