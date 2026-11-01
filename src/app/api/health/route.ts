import { NextResponse } from "next/server";
import { getPool, readyDatabase } from "@/lib/db";

export async function GET() {
  try {
    // Connectivity first — do not require a full schema migrate for liveness.
    await getPool().query("SELECT 1");
    try {
      await readyDatabase();
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      console.error(
        "schema migrate failed (db still up):",
        message.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://redacted"),
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("health check failed:", message.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://redacted"));
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
