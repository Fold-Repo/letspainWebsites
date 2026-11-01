import { NextResponse } from "next/server";
import { BookingError } from "@/lib/bookings";
import { previewRefund } from "@/lib/refunds";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") ?? "";
  if (!code.trim()) {
    return NextResponse.json({ message: "Enter your booking reference." }, { status: 400 });
  }
  try {
    const preview = await previewRefund(code);
    return NextResponse.json({ preview });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Could not look up that booking." }, { status: 500 });
  }
}
