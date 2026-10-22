import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/admin-session";
import {
  AdminError,
  deleteAdmin,
  getAdminByEmail,
  isProtectedAdmin,
  updateAdminPassword,
  updateAdminRole,
} from "@/lib/admins";
import { writeAudit } from "@/lib/audit";
import { isAdminRole } from "@/lib/roles";

type Params = { params: Promise<{ email: string }> };

function decodeEmail(raw: string) {
  try {
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

export async function GET(_request: Request, { params }: Params) {
  const admin = await requireCapability("settings");
  if (!admin) return NextResponse.json({ message: "Sign in again." }, { status: 401 });
  const email = decodeEmail((await params).email);
  const row = await getAdminByEmail(email);
  if (!row) return NextResponse.json({ message: "Admin not found." }, { status: 404 });
  return NextResponse.json({
    admin: {
      id: row.id,
      email: row.email,
      role: row.role,
      mfaEnabled: row.mfaEnabled,
      protected: await isProtectedAdmin(row.email),
    },
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const admin = await requireCapability("settings");
  if (!admin) return NextResponse.json({ message: "Sign in again." }, { status: 401 });
  const email = decodeEmail((await params).email);

  let body: { role?: string; password?: string };
  try {
    body = (await request.json()) as { role?: string; password?: string };
  } catch {
    body = {};
  }

  try {
    const updates: { email: string; role?: string; passwordUpdated?: boolean } = { email };
    if (body.role != null && body.role !== "") {
      if (!isAdminRole(body.role)) {
        return NextResponse.json({ message: "Choose a valid role." }, { status: 400 });
      }
      const result = await updateAdminRole(email, body.role, admin.email);
      updates.role = result.role;
      await writeAudit({
        actorEmail: admin.email,
        action: "admin_update_role",
        entityType: "admin",
        entityId: email,
        detail: `role=${result.role}`,
      });
    }
    if (body.password != null && body.password !== "") {
      await updateAdminPassword(email, body.password);
      updates.passwordUpdated = true;
      await writeAudit({
        actorEmail: admin.email,
        action: "admin_update_password",
        entityType: "admin",
        entityId: email,
        detail: "password_reset",
      });
    }
    if (updates.role == null && !updates.passwordUpdated) {
      return NextResponse.json({ message: "Provide a role and/or new password." }, { status: 400 });
    }
    const row = await getAdminByEmail(email);
    return NextResponse.json({
      ok: true,
      admin: row
        ? {
            id: row.id,
            email: row.email,
            role: row.role,
            mfaEnabled: row.mfaEnabled,
            protected: await isProtectedAdmin(row.email),
          }
        : null,
    });
  } catch (error) {
    if (error instanceof AdminError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Could not update that admin." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const admin = await requireCapability("settings");
  if (!admin) return NextResponse.json({ message: "Sign in again." }, { status: 401 });
  const email = decodeEmail((await params).email);

  try {
    await deleteAdmin(email, admin.email);
    await writeAudit({
      actorEmail: admin.email,
      action: "admin_delete",
      entityType: "admin",
      entityId: email,
      detail: "deleted",
    });
    return NextResponse.json({ ok: true, email });
  } catch (error) {
    if (error instanceof AdminError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Could not delete that admin." }, { status: 500 });
  }
}
