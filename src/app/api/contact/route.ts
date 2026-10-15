import { NextResponse } from "next/server";
import { parseMessage, saveMessage } from "@/lib/messages";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "The message was empty." }, { status: 400 });
  }
  const input = parseMessage(body);
  if (input.company) {
    return NextResponse.json({ message: "Thanks, we have your note." });
  }
  try {
    await saveMessage(input);
    return NextResponse.json({
      message: "Thanks. We have your message and will reply by email.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "We could not send that.";
    const status = message.startsWith("Add") ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
