import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import { createEvent, EventError, parseEventInput } from "@/lib/events";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Sign in again." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "The event form was empty." }, { status: 400 });
  }
  try {
    const hangout = await createEvent(parseEventInput(body));
    return NextResponse.json({ slug: hangout.slug });
  } catch (error) {
    if (error instanceof EventError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "The event could not be saved." }, { status: 500 });
  }
}
