import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/admin-session";
import { AdminError, createAdmin, listAdmins } from "@/lib/admins";
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

export async function POST(request: Request) {
  const admin = await requireCapability("settings");
  if (!admin) return NextResponse.json({ message: "Sign in again." }, { status: 401 });

  let body: { email?: string; password?: string; role?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string; role?: string };
  } catch {
    body = {};
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const role = String(body.role ?? "editor");
  if (!isAdminRole(role)) {
    return NextResponse.json({ message: "Choose a valid role." }, { status: 400 });
  }

  try {
    const created = await createAdmin({ email, password, role });
    await writeAudit({
      actorEmail: admin.email,
      action: "admin_create",
      entityType: "admin",
      entityId: created.email,
      detail: `role=${created.role}`,
    });
    return NextResponse.json({ ok: true, admin: created }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Could not create that admin." }, { status: 500 });
  }
}
