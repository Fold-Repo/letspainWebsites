import type { Booking } from "./bookings";
import { supportEmail } from "./event";
import type { Hangout } from "./events";
import { formatGbp } from "./money";

function amountLine(booking: Booking) {
  return booking.amountPence != null ? formatGbp(booking.amountPence) : "your payment";
}

export function refundRequestedText(booking: Booking, hangout: Hangout, reason: string) {
  return [
    `Refund request received · ${booking.code}`,
    ``,
    `Hi ${booking.firstName},`,
    ``,
    `We have your refund request for ${hangout.name} (${booking.code}).`,
    `Amount: ${amountLine(booking)}`,
    ``,
    `Your reason:`,
    reason,
    ``,
    `Our team will review it shortly. You will get another email once it is approved or declined.`,
    ``,
    `Questions? ${supportEmail()}`,
  ].join("\n");
}

export function refundRequestedHtml(booking: Booking, hangout: Hangout, reason: string) {
  return `<p>Hi ${escape(booking.firstName)},</p>
<p>We have your refund request for <strong>${escape(hangout.name)}</strong> (<strong>${escape(booking.code)}</strong>).</p>
<p>Amount: <strong>${escape(amountLine(booking))}</strong></p>
<p>Your reason:</p>
<p>${escape(reason).replaceAll("\n", "<br />")}</p>
<p>Our team will review it shortly. You will get another email once it is approved or declined.</p>
<p>Questions? <a href="mailto:${escape(supportEmail())}">${escape(supportEmail())}</a></p>`;
}

export function refundProcessingText(booking: Booking, hangout: Hangout) {
  return [
    `Refund approved · ${booking.code}`,
    ``,
    `Hi ${booking.firstName},`,
    ``,
    `Your refund for ${hangout.name} (${booking.code}) has been approved.`,
    `Amount: ${amountLine(booking)}`,
    ``,
    `We have started the refund with Stripe. Card payments usually take a few working days to appear on your statement.`,
    ``,
    `Questions? ${supportEmail()}`,
  ].join("\n");
}

export function refundProcessingHtml(booking: Booking, hangout: Hangout) {
  return `<p>Hi ${escape(booking.firstName)},</p>
<p>Your refund for <strong>${escape(hangout.name)}</strong> (<strong>${escape(booking.code)}</strong>) has been approved.</p>
<p>Amount: <strong>${escape(amountLine(booking))}</strong></p>
<p>We have started the refund with Stripe. Card payments usually take a few working days to appear on your statement.</p>
<p>Questions? <a href="mailto:${escape(supportEmail())}">${escape(supportEmail())}</a></p>`;
}

export function refundRejectedText(booking: Booking, hangout: Hangout, reason: string) {
  return [
    `Refund request update · ${booking.code}`,
    ``,
    `Hi ${booking.firstName},`,
    ``,
    `We reviewed your refund request for ${hangout.name} (${booking.code}) and could not approve it this time.`,
    ``,
    `Reason from our team:`,
    reason,
    ``,
    `If you need to talk this through, write to ${supportEmail()}.`,
  ].join("\n");
}

export function refundRejectedHtml(booking: Booking, hangout: Hangout, reason: string) {
  return `<p>Hi ${escape(booking.firstName)},</p>
<p>We reviewed your refund request for <strong>${escape(hangout.name)}</strong> (<strong>${escape(booking.code)}</strong>) and could not approve it this time.</p>
<p>Reason from our team:</p>
<p>${escape(reason).replaceAll("\n", "<br />")}</p>
<p>If you need to talk this through, write to <a href="mailto:${escape(supportEmail())}">${escape(supportEmail())}</a>.</p>`;
}

function escape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
