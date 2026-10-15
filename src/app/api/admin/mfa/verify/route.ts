import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  MFA_COOKIE,
  adminCookieOptions,
  createSessionToken,
  homePathForRole,
  readMfaChallengeToken,
} from "@/lib/admin-session";
import { decryptSecret, getAdminByEmail } from "@/lib/admins";
import { writeAudit } from "@/lib/audit";
import { cookies } from "next/headers";
import { verifyTotp } from "@/lib/totp";

export async function POST(request: Request) {
  const jar = await cookies();
  const challenge = readMfaChallengeToken(jar.get(MFA_COOKIE)?.value);
  if (!challenge) {
    return NextResponse.json({ message: "Sign in again, then enter your authenticator code." }, { status: 401 });
  }
  let body: { code?: string };
  try {
    body = (await request.json()) as { code?: string };
  } catch {
    body = {};
  }
  const admin = await getAdminByEmail(challenge.email);
  if (!admin?.mfaEnabled || !admin.mfaSecretEnc) {
    return NextResponse.json({ message: "MFA is not enabled for this account." }, { status: 400 });
  }
  let secret = "";
  try {
    secret = decryptSecret(admin.mfaSecretEnc);
  } catch {
    return NextResponse.json({ message: "MFA could not be verified. Contact an owner." }, { status: 500 });
  }
  if (!verifyTotp(secret, String(body.code ?? ""))) {
    return NextResponse.json({ message: "That authenticator code is not right." }, { status: 401 });
  }

  await writeAudit({
    actorEmail: admin.email,
    action: "login_mfa",
    entityType: "admin",
    entityId: admin.email,
    detail: `role=${admin.role}`,
  }).catch(() => undefined);

  const response = NextResponse.json({ ok: true, redirect: homePathForRole(admin.role) });
  response.cookies.set(ADMIN_COOKIE, createSessionToken(admin.email, admin.role), adminCookieOptions());
  response.cookies.set(MFA_COOKIE, "", { ...adminCookieOptions(0), maxAge: 0 });
  return response;
}
