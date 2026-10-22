import { mkdir, writeFile } from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";
import type { Booking } from "./bookings";
import { supportEmail } from "./event";
import { getEvent, type Hangout } from "./events";
import { paymentEmailHtml, paymentEmailText, receiptEmailHtml, receiptEmailText } from "./payment-email";
import { organiserEmailText, ticketEmailHtml, ticketEmailText } from "./ticket-email";
import { ticketQrPng } from "./ticket";

export type EmailResult = {
  sent: boolean;
  reason?: string;
};

function mailFrom() {
  return process.env.MAIL_FROM || "Let's All Paints <bookings@letsallpaints.com>";
}

function notifyEmail() {
  return process.env.BOOKING_NOTIFY_EMAIL || supportEmail();
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function saveOutbox(name: string, html: string, text: string) {
  const dir = path.join(process.cwd(), "data", "outbox");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${name}.html`), html);
  await writeFile(path.join(dir, `${name}.txt`), text);
}

async function deliver(options: nodemailer.SendMailOptions, fallbackName: string, html: string, text: string): Promise<EmailResult> {
  await saveOutbox(fallbackName, html, text);
  if (!smtpConfigured()) {
    return { sent: false, reason: "Email is not configured yet. A copy was saved on the server." };
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  try {
    await transporter.sendMail(options);
    return { sent: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Email could not be sent.";
    return { sent: false, reason };
  }
}

async function hangoutFor(booking: Booking): Promise<Hangout> {
  const hangout = await getEvent(booking.eventSlug);
  if (hangout) return hangout;
  return {
    slug: booking.eventSlug,
    name: "Let's All Paints hangout",
    tagline: "",
    summary: "",
    city: "",
    venue: "",
    whenLabel: "",
    timeLabel: "",
    story: "",
    inclusions: [],
    capacity: 0,
    enrollmentStartsAt: new Date(0).toISOString(),
    enrollmentEndsAt: new Date(0).toISOString(),
    isFree: booking.paymentStatus === "free",
    pricePence: null,
    familyPricePence: null,
    paymentTiming: "later",
    published: false,
    imageUrl: "",
    eventDate: "",
    eventTime: "",
  };
}

export async function sendBookingEmails(booking: Booking): Promise<EmailResult> {
  const hangout = await hangoutFor(booking);
  const html = ticketEmailHtml(booking, hangout);
  const text = ticketEmailText(booking, hangout);
  const png = await ticketQrPng(booking.code);
  const result = await deliver(
    {
      from: mailFrom(),
      to: booking.email,
      replyTo: supportEmail(),
      subject: `Your ${hangout.name} voucher · ${booking.code}`,
      text,
      html,
      attachments: [{ filename: "ticket-qr.png", content: png, cid: "ticket-qr" }],
    },
    booking.code,
    html,
    text,
  );
  if (result.sent) {
    const organiser = organiserEmailText(booking, hangout);
    await deliver(
      {
        from: mailFrom(),
        to: notifyEmail(),
        replyTo: booking.email,
        subject: `New reservation ${booking.code} · ${booking.firstName} ${booking.lastName}`,
        text: organiser,
      },
      `${booking.code}-organiser`,
      `<pre>${organiser}</pre>`,
      organiser,
    );
  }
  return result;
}

export async function sendPaymentLinkEmail(booking: Booking, url: string): Promise<EmailResult> {
  const hangout = await hangoutFor(booking);
  const html = paymentEmailHtml(booking, url, hangout);
  const text = paymentEmailText(booking, url, hangout);
  return deliver(
    {
      from: mailFrom(),
      to: booking.email,
      replyTo: supportEmail(),
      subject: `Pay for your ${hangout.name} places · ${booking.code}`,
      text,
      html,
    },
    `${booking.code}-payment`,
    html,
    text,
  );
}

export async function sendPaymentReceipt(booking: Booking): Promise<EmailResult> {
  const hangout = await hangoutFor(booking);
  const html = receiptEmailHtml(booking, hangout);
  const text = receiptEmailText(booking, hangout);
  return deliver(
    {
      from: mailFrom(),
      to: booking.email,
      replyTo: supportEmail(),
      subject: `Payment received · ${booking.code}`,
      text,
      html,
    },
    `${booking.code}-receipt`,
    html,
    text,
  );
}

export async function sendPartnershipNotice(enquiry: {
  id: number;
  name: string;
  organisation: string;
  email: string;
  phone: string;
  categoryLabel: string;
  message: string;
  website: string;
}): Promise<EmailResult> {
  const text = [
    `Partnership enquiry · ${enquiry.categoryLabel}`,
    ``,
    `${enquiry.name}, ${enquiry.organisation}`,
    enquiry.email,
    enquiry.phone || "No phone",
    enquiry.website || "No website",
    ``,
    enquiry.message,
  ].join("\n");
  const html = `<p><strong>${escapeHtml(enquiry.categoryLabel)}</strong> partnership enquiry</p>
<p>${escapeHtml(enquiry.name)} · ${escapeHtml(enquiry.organisation)}<br />
<a href="mailto:${escapeHtml(enquiry.email)}">${escapeHtml(enquiry.email)}</a><br />
${escapeHtml(enquiry.phone || "No phone")}<br />
${enquiry.website ? `<a href="${escapeHtml(enquiry.website)}">${escapeHtml(enquiry.website)}</a>` : "No website"}</p>
<p>${escapeHtml(enquiry.message).replaceAll("\n", "<br />")}</p>`;
  return deliver(
    {
      from: mailFrom(),
      to: notifyEmail(),
      replyTo: enquiry.email,
      subject: `Partnership enquiry · ${enquiry.categoryLabel} · ${enquiry.organisation}`,
      text,
      html,
    },
    `partnership-${enquiry.id}`,
    html,
    text,
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
