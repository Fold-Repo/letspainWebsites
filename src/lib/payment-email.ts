import type { Booking } from "./bookings";
import { guestName } from "./bookings";
import { brand, supportEmail } from "./event";
import type { Hangout } from "./events";
import { formatGbp } from "./money";
import { confirmationUrl, partyLabel } from "./ticket";

function rateLine(booking: Booking) {
  const seats = booking.adults + booking.children;
  if (booking.pricingChoice === "family") return "Family or group price";
  if (booking.pricingChoice === "custom") return "Custom price for this party";
  if (booking.amountPence && seats > 0 && booking.amountPence % seats === 0) {
    return `${formatGbp(booking.amountPence / seats)} per person`;
  }
  return "Price for this party";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function paymentEmailText(booking: Booking, url: string, hangout: Hangout) {
  const total = booking.amountPence ?? 0;
  return [
    brand,
    `Payment for ${hangout.name}`,
    ``,
    `Guest: ${guestName(booking)}`,
    `Party: ${partyLabel(booking)}`,
    `Reference: ${booking.code}`,
    `Amount: ${formatGbp(total)}`,
    ``,
    `Pay within 24 hours:`,
    url,
    ``,
    `Card details are taken by Stripe. We do not see or store the card number.`,
    `Questions: ${supportEmail()}`,
  ].join("\n");
}

export function paymentEmailHtml(booking: Booking, url: string, hangout: Hangout) {
  const total = formatGbp(booking.amountPence ?? 0);
  const rate = rateLine(booking);
  const safeUrl = escapeHtml(url);
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#F8F0E8;color:#28212A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F0E8;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFDFB;border:2px solid #75294D;border-radius:22px;overflow:hidden;">
          <tr>
            <td style="background:#75294D;padding:22px 28px 18px;">
              <p style="margin:0;font-family:Georgia,serif;font-size:13px;letter-spacing:0.22em;text-transform:uppercase;color:#E8A5B7;">Let's All Paints</p>
              <p style="margin:10px 0 0;font-family:Georgia,serif;font-size:28px;line-height:1.1;color:#F8F0E8;">Payment slip</p>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 28px 8px;">
              <p style="margin:0;font-family:Georgia,serif;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#75294D;">${escapeHtml(hangout.name)}</p>
              <p style="margin:8px 0 0;font-family:Georgia,serif;font-size:40px;line-height:1;color:#28212A;">${escapeHtml(total)}</p>
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#5c4c55;">${escapeHtml(rate)} · ${escapeHtml(partyLabel(booking))}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E8A5B7;">
                <tr>
                  <td style="padding:12px 0;font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#75294D;width:34%;">Guest</td>
                  <td style="padding:12px 0;font-family:Georgia,serif;font-size:16px;">${escapeHtml(guestName(booking))}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-top:1px solid #F3D5DE;font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#75294D;">Reference</td>
                  <td style="padding:12px 0;border-top:1px solid #F3D5DE;font-family:Georgia,serif;font-size:16px;letter-spacing:0.06em;">${escapeHtml(booking.code)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 28px;">
              <a href="${safeUrl}" style="display:inline-block;background:#75294D;color:#F8F0E8;font-family:Arial,sans-serif;font-size:16px;text-decoration:none;padding:14px 28px;border-radius:999px;">Pay now</a>
              <p style="margin:14px 0 0;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:#5c4c55;">This link expires in 24 hours. If it lapses, reply and we will send another.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#F8F0E8;padding:16px 28px 20px;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;line-height:1.55;">Stripe takes the card payment. We never see or store the card number. Questions: <a href="mailto:${escapeHtml(supportEmail())}" style="color:#75294D;">${escapeHtml(supportEmail())}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function receiptEmailText(booking: Booking, hangout: Hangout) {
  return [
    `Payment received for ${hangout.name}`,
    `Reference: ${booking.code}`,
    `Amount: ${formatGbp(booking.amountPence ?? 0)}`,
    `Voucher: ${confirmationUrl(booking.code)}`,
  ].join("\n");
}

export function receiptEmailHtml(booking: Booking, hangout: Hangout) {
  const url = confirmationUrl(booking.code);
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#F8F0E8;color:#28212A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F0E8;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFDFB;border:2px solid #75294D;border-radius:22px;overflow:hidden;">
          <tr>
            <td style="background:#75294D;padding:22px 28px;">
              <p style="margin:0;font-family:Georgia,serif;font-size:13px;letter-spacing:0.22em;text-transform:uppercase;color:#E8A5B7;">Let's All Paints</p>
              <p style="margin:10px 0 0;font-family:Georgia,serif;font-size:28px;color:#F8F0E8;">Payment received</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <p style="margin:0;font-family:Georgia,serif;font-size:32px;">${escapeHtml(formatGbp(booking.amountPence ?? 0))}</p>
              <p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;">${escapeHtml(guestName(booking))}, your places for ${escapeHtml(hangout.name)} are paid. Reference ${escapeHtml(booking.code)}.</p>
              <p style="margin:16px 0 0;"><a href="${escapeHtml(url)}" style="color:#75294D;">Open your voucher</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
