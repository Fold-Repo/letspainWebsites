import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/admin-session";
import { getAdminByEmail, setAdminMfa } from "@/lib/admins";
import { writeAudit } from "@/lib/audit";
import { generateTotpSecret, totpUri, verifyTotp } from "@/lib/totp";
import QRCode from "qrcode";

export async function GET() {
  const admin = await requireCapability("settings");
  if (!admin) return NextResponse.json({ message: "Sign in again." }, { status: 401 });
  const record = await getAdminByEmail(admin.email);
  if (!record) return NextResponse.json({ message: "Account not found." }, { status: 404 });
  const secret = generateTotpSecret();
  const uri = totpUri(admin.email, secret);
  const qrDataUrl = await QRCode.toDataURL(uri, {
    width: 220,
    margin: 1,
    color: { dark: "#28212A", light: "#FFFDFB" },
  });
  return NextResponse.json({
    secret,
    uri,
    qrDataUrl,
    enabled: record.mfaEnabled,
  });
}

export async function POST(request: Request) {
  const admin = await requireCapability("settings");
  if (!admin) return NextResponse.json({ message: "Sign in again." }, { status: 401 });
  let body: { secret?: string; code?: string; disable?: boolean };
  try {
    body = (await request.json()) as { secret?: string; code?: string; disable?: boolean };
  } catch {
    body = {};
  }
  if (body.disable) {
    await setAdminMfa(admin.email, null, false);
    await writeAudit({
      actorEmail: admin.email,
      action: "mfa_disable",
      entityType: "admin",
      entityId: admin.email,
    });
    return NextResponse.json({ ok: true, enabled: false });
  }
  const secret = String(body.secret ?? "");
  if (!secret || !verifyTotp(secret, String(body.code ?? ""))) {
    return NextResponse.json({ message: "Enter the 6-digit code from your authenticator app." }, { status: 400 });
  }
  await setAdminMfa(admin.email, secret, true);
  await writeAudit({
    actorEmail: admin.email,
    action: "mfa_enable",
    entityType: "admin",
    entityId: admin.email,
  });
  return NextResponse.json({ ok: true, enabled: true });
}
