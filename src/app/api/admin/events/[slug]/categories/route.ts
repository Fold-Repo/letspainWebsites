import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/admin-session";
import { writeAudit } from "@/lib/audit";
import { getEvent } from "@/lib/events";
import { createCategory, listCategories, parseCategoryInput, TicketError } from "@/lib/ticket-categories";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const admin = await requireCapability("events");
  if (!admin) return NextResponse.json({ message: "Sign in again." }, { status: 401 });
  const { slug } = await context.params;
  const hangout = await getEvent(slug);
  if (!hangout) return NextResponse.json({ message: "Event not found." }, { status: 404 });
  return NextResponse.json({ categories: await listCategories(slug) });
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const admin = await requireCapability("events");
  if (!admin) return NextResponse.json({ message: "Sign in again." }, { status: 401 });
  const { slug } = await context.params;
  const hangout = await getEvent(slug);
  if (!hangout) return NextResponse.json({ message: "Event not found." }, { status: 404 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "The ticket form was empty." }, { status: 400 });
  }
  try {
    const category = await createCategory(slug, parseCategoryInput(body));
    await writeAudit({
      actorEmail: admin.email,
      action: "category_create",
      entityType: "ticket_category",
      entityId: String(category.id),
      detail: `${slug}:${category.name}`,
    });
    return NextResponse.json({ category });
  } catch (error) {
    if (error instanceof TicketError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Could not save the ticket type." }, { status: 500 });
  }
}
