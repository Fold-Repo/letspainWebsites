import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import { EventError, parseEventInput, updateEvent } from "@/lib/events";

export async function PATCH(request: Request, context: { params: Promise<{ slug: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Sign in again." }, { status: 401 });
  const { slug } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "The event form was empty." }, { status: 400 });
  }
  try {
    const hangout = await updateEvent(slug, parseEventInput(body, slug));
    if (!hangout) return NextResponse.json({ message: "That event was not found." }, { status: 404 });
    return NextResponse.json({ slug: hangout.slug });
  } catch (error) {
    if (error instanceof EventError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "The event could not be saved." }, { status: 500 });
  }
}
