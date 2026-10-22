import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export function uploadsRoot() {
  return path.join(process.cwd(), "data", "uploads", "events");
}

export function mediaUrlFor(filename: string) {
  return `/api/media/events/${filename}`;
}

export async function saveEventImage(file: File) {
  const type = file.type || "";
  const ext = ALLOWED.get(type);
  if (!ext) {
    throw new Error("Use a JPG, PNG, or WebP image.");
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new Error("Image must be under 5MB.");
  }
  const dir = uploadsRoot();
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);
  return mediaUrlFor(filename);
}

export function isSafeMediaName(name: string) {
  return /^[a-zA-Z0-9._-]+$/.test(name) && !name.includes("..");
}
