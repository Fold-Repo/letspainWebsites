import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/admin-session";
import { writeAudit } from "@/lib/audit";
import { createEvent, EventError, parseEventInput } from "@/lib/events";
import {
  createCategory,
  parseEventCategories,
  seedDefaultCategories,
  TicketError,
} from "@/lib/ticket-categories";

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
    const categories = parseEventCategories(body).filter((category) => category.active);
    if (categories.length > 0) {
      for (const category of categories) {
        await createCategory(hangout.slug, category);
      }
    } else if (!hangout.isFree) {
      await seedDefaultCategories(hangout.slug);
    }
    await writeAudit({
      actorEmail: admin.email,
      action: "event_create",
      entityType: "event",
      entityId: hangout.slug,
      detail: hangout.name,
    });
    return NextResponse.json({ slug: hangout.slug });
  } catch (error) {
    if (error instanceof EventError || error instanceof TicketError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "The event could not be saved." }, { status: 500 });
  }
}
