import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  let body: { analytics?: boolean; visitorKey?: string };
  try {
    body = (await request.json()) as { analytics?: boolean; visitorKey?: string };
  } catch {
    body = {};
  }
  const visitorKey =
    String(body.visitorKey ?? "").trim().slice(0, 80) || `v_${randomBytes(12).toString("hex")}`;
  const analytics = Boolean(body.analytics);
  await query(
    `INSERT INTO consent_records (visitor_key, essential, analytics) VALUES ($1, TRUE, $2)`,
    [visitorKey, analytics],
  );
  const response = NextResponse.json({ ok: true, visitorKey, analytics });
  response.cookies.set("lap_consent", analytics ? "essential,analytics" : "essential", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
