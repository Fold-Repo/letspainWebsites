import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { isSafeMediaName, uploadsRoot } from "@/lib/media";

type Params = { params: Promise<{ name: string }> };

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(_request: Request, { params }: Params) {
  const { name } = await params;
  if (!isSafeMediaName(name)) {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }
  const ext = path.extname(name).toLowerCase();
  const type = TYPES[ext];
  if (!type) return NextResponse.json({ message: "Not found." }, { status: 404 });
  try {
    const buffer = await readFile(path.join(uploadsRoot(), name));
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }
}
