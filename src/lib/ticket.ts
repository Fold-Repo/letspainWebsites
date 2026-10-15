import QRCode from "qrcode";
import { brand, publicSiteUrl, supportEmail } from "./event";
import { holdNote, type Hangout } from "./events";
import { guestName, partySize, type Booking } from "./bookings";

export function confirmationPath(code: string) {
  return `/book/confirmation/${code}`;
}

export function confirmationUrl(code: string) {
  return `${publicSiteUrl()}${confirmationPath(code)}`;
}

export function partyLabel(booking: Pick<Booking, "adults" | "children">) {
  const adults = `${booking.adults} ${booking.adults === 1 ? "adult" : "adults"}`;
  if (booking.children === 0) return adults;
  const children = `${booking.children} ${booking.children === 1 ? "child" : "children"}`;
  return `${adults}, ${children}`;
}

export async function ticketQrDataUrl(code: string) {
  return QRCode.toDataURL(confirmationUrl(code), {
    width: 280,
    margin: 1,
    color: { dark: "#28212A", light: "#FFFDFB" },
  });
}

export async function ticketQrPng(code: string) {
  return QRCode.toBuffer(confirmationUrl(code), {
    type: "png",
    width: 280,
    margin: 1,
    color: { dark: "#28212A", light: "#FFFDFB" },
  });
}

export function ticketFacts(booking: Booking, hangout: Hangout) {
  return {
    brand,
    eventName: hangout.name,
    city: hangout.city,
    whenLabel: hangout.whenLabel,
    venue: hangout.venue,
    time: hangout.timeLabel,
    guest: guestName(booking),
    email: booking.email,
    party: partyLabel(booking),
    seats: partySize(booking),
    code: booking.code,
    support: supportEmail(),
    url: confirmationUrl(booking.code),
    holdNote: holdNote(hangout),
  };
}
