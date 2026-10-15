import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieOptions, createSessionToken } from "@/lib/admin-session";
import { query } from "@/lib/db";
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
  const found = await query<{ password_hash: string }>("SELECT password_hash FROM admins WHERE email = $1", [email]);
  const hash = found.rows[0]?.password_hash;
  if (!hash || !(await verifyPassword(password, hash))) return invalid;
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, createSessionToken(email), adminCookieOptions());
  return response;
}
