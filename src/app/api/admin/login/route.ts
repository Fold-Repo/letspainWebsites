import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  MFA_COOKIE,
  adminCookieOptions,
  createMfaChallengeToken,
  createSessionToken,
  homePathForRole,
} from "@/lib/admin-session";
import { getAdminByEmail } from "@/lib/admins";
import { writeAudit } from "@/lib/audit";
import { verifyPassword } from "@/lib/password";

const hits = new Map<string, number[]>();

function limited(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < 60_000);
  if (recent.length >= 8) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export async function POST(request: Request) {
  if (limited(request)) {
    return NextResponse.json({ message: "Too many attempts. Wait a minute and try again." }, { status: 429 });
  }
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ message: "Enter your email and password." }, { status: 400 });
  }
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const invalid = NextResponse.json({ message: "That email or password is not right." }, { status: 401 });
  if (!email || password.length < 8) return invalid;
  const admin = await getAdminByEmail(email);
  if (!admin || !(await verifyPassword(password, admin.passwordHash))) return invalid;

  if (admin.mfaEnabled && admin.mfaSecretEnc) {
    const response = NextResponse.json({ ok: true, mfaRequired: true });
    response.cookies.set(MFA_COOKIE, createMfaChallengeToken(email), adminCookieOptions(10 * 60));
    return response;
  }

  await writeAudit({
    actorEmail: email,
    action: "login",
    entityType: "admin",
    entityId: email,
    detail: `role=${admin.role}`,
  }).catch(() => undefined);

  const response = NextResponse.json({ ok: true, redirect: homePathForRole(admin.role) });
  response.cookies.set(ADMIN_COOKIE, createSessionToken(email, admin.role), adminCookieOptions());
  response.cookies.set(MFA_COOKIE, "", { ...adminCookieOptions(0), maxAge: 0 });
  return response;
}
