import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/admin-session";
import { writeAudit } from "@/lib/audit";
import { createEvent, EventError, parseEventInput } from "@/lib/events";

export async function POST(request: Request) {
  const admin = await requireCapability("events");
  if (!admin) return NextResponse.json({ message: "Sign in again." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "The event form was empty." }, { status: 400 });
  }
  try {
    const hangout = await createEvent(parseEventInput(body));
    await writeAudit({
      actorEmail: admin.email,
      action: "event_create",
      entityType: "event",
      entityId: hangout.slug,
      detail: hangout.name,
    });
    return NextResponse.json({ slug: hangout.slug });
  } catch (error) {
    if (error instanceof EventError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "The event could not be saved." }, { status: 500 });
  }
}
