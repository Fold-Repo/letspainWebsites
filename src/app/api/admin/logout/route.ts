import { NextResponse } from "next/server";
import { ADMIN_COOKIE, MFA_COOKIE, adminCookieOptions, requireAdmin } from "@/lib/admin-session";
import { writeAudit } from "@/lib/audit";

export async function POST() {
  const admin = await requireAdmin();
  if (admin) {
    await writeAudit({
      actorEmail: admin.email,
      action: "logout",
      entityType: "admin",
      entityId: admin.email,
    }).catch(() => undefined);
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", { ...adminCookieOptions(0), maxAge: 0 });
  response.cookies.set(MFA_COOKIE, "", { ...adminCookieOptions(0), maxAge: 0 });
  return response;
}
