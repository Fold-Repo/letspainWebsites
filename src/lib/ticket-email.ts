import type { Booking } from "./bookings";
import type { Hangout } from "./events";
import { ticketFacts } from "./ticket";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function ticketEmailText(booking: Booking, hangout: Hangout) {
  const ticket = ticketFacts(booking, hangout);
  return [
    `${ticket.brand}`,
    `Reservation voucher`,
    ``,
    `${ticket.eventName}`,
    `${ticket.city} · ${ticket.whenLabel}`,
    `${ticket.venue}`,
    `${ticket.time}`,
    ``,
    `Guest: ${ticket.guest}`,
    `Party: ${ticket.party}`,
    `Reference: ${ticket.code}`,
    ``,
    ticket.holdNote,
    ``,
    `Show this email at the door.`,
    ticket.url,
    ``,
    `Questions: ${ticket.support}`,
  ].join("\n");
}

export function ticketEmailHtml(booking: Booking, hangout: Hangout, qrSrc = "cid:ticket-qr") {
  const ticket = ticketFacts(booking, hangout);
  const guest = escapeHtml(ticket.guest);
  const party = escapeHtml(ticket.party);
  const code = escapeHtml(ticket.code);
  const email = escapeHtml(ticket.email);
  const support = escapeHtml(ticket.support);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Your ${escapeHtml(ticket.eventName)} voucher</title>
</head>
<body style="margin:0;padding:0;background:#F8F0E8;color:#28212A;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${guest}, your ${escapeHtml(ticket.eventName)} reservation is ${code}.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F0E8;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFDFB;border:2px solid #75294D;border-radius:22px;overflow:hidden;">
          <tr>
            <td style="background:#75294D;padding:22px 28px 18px;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:0.22em;text-transform:uppercase;color:#E8A5B7;">Let's All Paints</p>
              <p style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.1;color:#F8F0E8;">Reservation voucher</p>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 28px 8px;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#75294D;">Admit ${ticket.seats === 1 ? "one" : ticket.seats}</p>
              <h1 style="margin:8px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:0.95;font-weight:500;color:#28212A;">${escapeHtml(ticket.eventName)}</h1>
              <p style="margin:14px 0 0;font-family:Georgia,serif;font-size:16px;color:#75294D;">${escapeHtml(ticket.city)} · ${escapeHtml(ticket.whenLabel)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E8A5B7;border-bottom:1px solid #E8A5B7;">
                <tr>
                  <td style="padding:12px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#75294D;width:34%;">Guest</td>
                  <td style="padding:12px 0;font-family:Georgia,serif;font-size:16px;color:#28212A;">${guest}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-top:1px solid #F3D5DE;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#75294D;">Party</td>
                  <td style="padding:12px 0;border-top:1px solid #F3D5DE;font-family:Georgia,serif;font-size:16px;color:#28212A;">${party}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-top:1px solid #F3D5DE;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#75294D;">When</td>
                  <td style="padding:12px 0;border-top:1px solid #F3D5DE;font-family:Georgia,serif;font-size:16px;color:#28212A;">${escapeHtml(ticket.whenLabel)}<br /><span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5c4c55;">${escapeHtml(ticket.time)}</span></td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-top:1px solid #F3D5DE;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#75294D;">Where</td>
                  <td style="padding:12px 0;border-top:1px solid #F3D5DE;font-family:Georgia,serif;font-size:16px;color:#28212A;">${escapeHtml(ticket.venue)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 28px 8px;">
              <img src="${qrSrc}" width="168" height="168" alt="QR code for reservation ${code}" style="display:block;border:1px solid #E8A5B7;border-radius:12px;background:#FFFDFB;" />
              <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#75294D;">Scan at the door</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:2px dashed #D6A348;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 22px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#75294D;">Booking reference</p>
              <p style="margin:6px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:32px;letter-spacing:0.08em;color:#75294D;">${code}</p>
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#28212A;">Sent to ${email}. Keep this voucher. Bring it on the day, on your phone or printed.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#F8F0E8;padding:16px 28px 20px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#28212A;">This confirms a reservation for ${party}. ${escapeHtml(ticket.holdNote)}</p>
              <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#28212A;">Questions or a change of party: <a href="mailto:${support}" style="color:#75294D;">${support}</a></p>
            </td>
          </tr>
        </table>
        <p style="max-width:560px;margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5c4c55;">Let's All Paints · ${escapeHtml(ticket.eventName)} · ${escapeHtml(ticket.city)} · ${escapeHtml(ticket.whenLabel)}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function organiserEmailText(booking: Booking, hangout: Hangout) {
  const ticket = ticketFacts(booking, hangout);
  return [
    `New reservation ${ticket.code}`,
    ticket.eventName,
    `${ticket.guest} <${ticket.email}>`,
    `Party: ${ticket.party} (${ticket.seats} seats)`,
    booking.phone ? `Phone: ${booking.phone}` : "Phone: not given",
    booking.notes ? `Notes: ${booking.notes}` : "Notes: none",
    `Marketing: ${booking.marketingOptIn ? "yes" : "no"}`,
    ticket.url,
  ].join("\n");
}
