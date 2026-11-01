import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/admin-session";
import { writeAudit } from "@/lib/audit";
import { getSocialSettings, saveSocialSettings } from "@/lib/site-settings";

export async function GET() {
  const admin = await requireCapability("settings");
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  const social = await getSocialSettings();
  return NextResponse.json(social);
}

export async function PUT(request: Request) {
  const admin = await requireCapability("settings");
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const payload = body as { instagram?: unknown; facebook?: unknown };
  const social = await saveSocialSettings({
    instagram: typeof payload.instagram === "string" ? payload.instagram : "",
    facebook: typeof payload.facebook === "string" ? payload.facebook : "",
  });

  await writeAudit({
    actorEmail: admin.email,
    action: "update_social_links",
    entityType: "site_settings",
    entityId: "social",
    detail: `instagram=${social.instagram}; facebook=${social.facebook}`,
  });

  return NextResponse.json(social);
}
