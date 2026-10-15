import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/admin-session";
import { writeAudit } from "@/lib/audit";
import { getEvent } from "@/lib/events";
import { deleteCategory, parseCategoryInput, TicketError, updateCategory } from "@/lib/ticket-categories";

type Params = { params: Promise<{ slug: string; id: string }> };

export async function PATCH(request: Request, context: Params) {
  const admin = await requireCapability("events");
  if (!admin) return NextResponse.json({ message: "Sign in again." }, { status: 401 });
  const { slug, id } = await context.params;
  const hangout = await getEvent(slug);
  if (!hangout) return NextResponse.json({ message: "Event not found." }, { status: 404 });
  const categoryId = Number(id);
  if (!Number.isInteger(categoryId)) {
    return NextResponse.json({ message: "Unknown ticket type." }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "The ticket form was empty." }, { status: 400 });
  }
  try {
    const category = await updateCategory(categoryId, slug, parseCategoryInput(body));
    if (!category) return NextResponse.json({ message: "Unknown ticket type." }, { status: 404 });
    await writeAudit({
      actorEmail: admin.email,
      action: "category_update",
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

export async function DELETE(_request: Request, context: Params) {
  const admin = await requireCapability("events");
  if (!admin) return NextResponse.json({ message: "Sign in again." }, { status: 401 });
  const { slug, id } = await context.params;
  const categoryId = Number(id);
  if (!Number.isInteger(categoryId)) {
    return NextResponse.json({ message: "Unknown ticket type." }, { status: 404 });
  }
  await deleteCategory(categoryId, slug);
  await writeAudit({
    actorEmail: admin.email,
    action: "category_delete",
    entityType: "ticket_category",
    entityId: String(categoryId),
    detail: slug,
  });
  return NextResponse.json({ ok: true });
}
