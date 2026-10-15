import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/admin-session";
import { listAdmins, updateAdminRole } from "@/lib/admins";
import { writeAudit } from "@/lib/audit";
import { isAdminRole } from "@/lib/roles";

export async function GET() {
  const admin = await requireCapability("settings");
  if (!admin) return NextResponse.json({ message: "Sign in again." }, { status: 401 });
  const admins = await listAdmins();
  return NextResponse.json({
    admins: admins.map((row) => ({
      email: row.email,
      role: row.role,
      mfaEnabled: row.mfaEnabled,
    })),
  });
}

export async function PATCH(request: Request) {
  const admin = await requireCapability("settings");
  if (!admin) return NextResponse.json({ message: "Sign in again." }, { status: 401 });
  let body: { email?: string; role?: string };
  try {
    body = (await request.json()) as { email?: string; role?: string };
  } catch {
    body = {};
  }
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = String(body.role ?? "");
  if (!email || !isAdminRole(role)) {
    return NextResponse.json({ message: "Choose a valid email and role." }, { status: 400 });
  }
  if (email === admin.email && role !== "owner") {
    return NextResponse.json({ message: "You cannot remove your own owner role." }, { status: 400 });
  }
  await updateAdminRole(email, role);
  await writeAudit({
    actorEmail: admin.email,
    action: "role_update",
    entityType: "admin",
    entityId: email,
    detail: `role=${role}`,
  });
  return NextResponse.json({ ok: true, email, role });
}
