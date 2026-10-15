import nodemailer from "nodemailer";
import { query } from "./db";
import { supportEmail } from "./event";

export type Message = {
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
};

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function parseMessage(body: unknown) {
  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return {
    name: clean(source.name, 80),
    email: clean(source.email, 120).toLowerCase(),
    subject: clean(source.subject, 120),
    message: String(source.message ?? "").trim().slice(0, 2000),
    company: clean(source.company, 80),
  };
}

export async function saveMessage(input: Omit<Message, "createdAt">) {
  if (input.name.length < 2) throw new Error("Add your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new Error("Add a valid email.");
  if (input.subject.length < 2) throw new Error("Add a subject.");
  if (input.message.length < 8) throw new Error("Add a short message.");

  const saved = await query<{ created_at: Date }>(
    "INSERT INTO messages (name, email, subject, body) VALUES ($1, $2, $3, $4) RETURNING created_at",
    [input.name, input.email, input.subject, input.message],
  );

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.MAIL_FROM || "Let's All Paints <bookings@letsallpaints.com>",
      to: supportEmail(),
      replyTo: input.email,
      subject: `Contact: ${input.subject}`,
      text: `${input.name} <${input.email}>\n\n${input.message}`,
    });
  }

  return {
    ...input,
    createdAt: new Date(saved.rows[0]!.created_at).toISOString(),
  };
}
