import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { can, homePathForRole, isAdminRole, type AdminCapability, type AdminRole } from "./roles";

export const ADMIN_COOKIE = "lap_admin";
export const MFA_COOKIE = "lap_mfa";

export type AdminSession = {
  email: string;
  role: AdminRole;
  exp: number;
};

type MfaChallenge = {
  email: string;
  exp: number;
};

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET ?? "";
  if (value.length >= 32) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters.");
  }
  return "dev-only-admin-session-secret-change-me";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function readSigned<T>(token: string | undefined | null): T | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as T & { exp?: number };
    if (!data || typeof data !== "object" || !data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function makeToken(data: object) {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function createSessionToken(email: string, role: AdminRole) {
  return makeToken({ email, role, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 } satisfies AdminSession);
}

export function createMfaChallengeToken(email: string) {
  return makeToken({ email, exp: Date.now() + 10 * 60 * 1000 } satisfies MfaChallenge);
}

export function readSessionToken(token: string | undefined | null): AdminSession | null {
  const data = readSigned<AdminSession>(token);
  if (!data?.email || !isAdminRole(data.role)) return null;
  return data;
}

export function readMfaChallengeToken(token: string | undefined | null): MfaChallenge | null {
  const data = readSigned<MfaChallenge>(token);
  if (!data?.email) return null;
  return data;
}

export function adminCookieOptions(maxAge = 60 * 60 * 24 * 7) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function requireAdmin() {
  const jar = await cookies();
  return readSessionToken(jar.get(ADMIN_COOKIE)?.value);
}

export async function requireCapability(capability: AdminCapability) {
  const admin = await requireAdmin();
  if (!admin || !can(admin.role, capability)) return null;
  return admin;
}

export async function requirePageCapability(capability: AdminCapability) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (!can(admin.role, capability)) redirect(homePathForRole(admin.role));
  return admin;
}

export { homePathForRole, can };
