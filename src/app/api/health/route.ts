import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    await query("SELECT 1");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("health check failed:", message.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://redacted"));
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
