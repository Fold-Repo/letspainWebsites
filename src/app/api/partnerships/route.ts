import { NextResponse } from "next/server";
import { sendPartnershipNotice } from "@/lib/email";
import { categoryLabel, createPartnership, markPartnershipEmail, parsePartnership, PartnershipError } from "@/lib/partnerships";

const hits = new Map<string, number[]>();

function limited(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < 60_000);
  if (recent.length >= 5) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export async function POST(request: Request) {
  if (limited(request)) {
    return NextResponse.json({ message: "Too many attempts. Wait a minute and try again." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "The enquiry was empty." }, { status: 400 });
  }
  try {
    const enquiry = await createPartnership(parsePartnership(body));
    const emailed = await sendPartnershipNotice({
      ...enquiry,
      categoryLabel: categoryLabel(enquiry.category),
    });
    const emailStatus = emailed.sent ? "sent" : emailed.reason?.includes("not configured") ? "unconfigured" : "failed";
    await markPartnershipEmail(enquiry.id, emailStatus);
    return NextResponse.json({
      message: "Thanks. We have your enquiry and will reply by email.",
    });
  } catch (error) {
    if (error instanceof PartnershipError) {
      if (error.status === 200) return NextResponse.json({ message: error.message });
      return NextResponse.json({ message: error.message, field: error.field }, { status: error.status });
    }
    return NextResponse.json({ message: "We could not save that enquiry." }, { status: 500 });
  }
}
