import { query } from "./db";
import { getBooking, guestName, type Booking, BookingError } from "./bookings";
import { supportEmail } from "./event";
import { getEvent } from "./events";
import { formatGbp } from "./money";

export type RefundStatus = "pending" | "approved" | "rejected";

export type RefundRequest = {
  id: number;
  bookingCode: string;
  reason: string;
  status: RefundStatus;
  rejectionReason: string;
  stripeRefundId: string | null;
  requestedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
};

export type RefundPreview = {
  code: string;
  guestName: string;
  emailMasked: string;
  eventName: string;
  whenLabel: string;
  amountLabel: string;
  amountPence: number | null;
  paymentStatus: Booking["paymentStatus"];
  checkedIn: boolean;
  canRequest: boolean;
  blockReason: string | null;
  pendingRefundId: number | null;
};

type RefundRow = {
  id: number;
  booking_code: string;
  reason: string;
  status: RefundStatus;
  rejection_reason: string;
  stripe_refund_id: string | null;
  requested_at: Date;
  resolved_at: Date | null;
  resolved_by: string | null;
};

function mapRefund(row: RefundRow): RefundRequest {
  return {
    id: row.id,
    bookingCode: row.booking_code,
    reason: row.reason,
    status: row.status,
    rejectionReason: row.rejection_reason,
    stripeRefundId: row.stripe_refund_id,
    requestedAt: new Date(row.requested_at).toISOString(),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : null,
    resolvedBy: row.resolved_by,
  };
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "•••";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
}

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export async function getPendingRefund(bookingCode: string) {
  const result = await query<RefundRow>(
    `SELECT * FROM refund_requests
     WHERE booking_code = $1 AND status = 'pending'
     ORDER BY requested_at DESC
     LIMIT 1`,
    [bookingCode.trim().toUpperCase()],
  );
  return result.rows[0] ? mapRefund(result.rows[0]) : null;
}

export async function getRefundRequest(id: number) {
  const result = await query<RefundRow>("SELECT * FROM refund_requests WHERE id = $1", [id]);
  return result.rows[0] ? mapRefund(result.rows[0]) : null;
}

export async function listPendingRefunds() {
  const result = await query<RefundRow>(
    `SELECT * FROM refund_requests WHERE status = 'pending' ORDER BY requested_at ASC`,
  );
  return result.rows.map(mapRefund);
}

export async function listApprovedRefundsNeedingSync() {
  const result = await query<RefundRow>(
    `SELECT r.*
     FROM refund_requests r
     INNER JOIN bookings b ON b.code = r.booking_code
     WHERE r.status = 'approved'
       AND b.payment_status = 'paid'
     ORDER BY r.resolved_at DESC NULLS LAST
     LIMIT 40`,
  );
  return result.rows.map(mapRefund);
}

export async function countRefundsByStatus() {
  const result = await query<{ status: RefundStatus; count: number }>(
    `SELECT status, COUNT(*)::int AS count
     FROM refund_requests
     GROUP BY status`,
  );
  const counts = { pending: 0, approved: 0, rejected: 0 };
  for (const row of result.rows) {
    if (row.status in counts) counts[row.status] = row.count;
  }
  return counts;
}

export async function listRefundsByBookingCodes(codes: string[]) {
  if (codes.length === 0) return [] as RefundRequest[];
  const result = await query<RefundRow>(
    `SELECT DISTINCT ON (booking_code) *
     FROM refund_requests
     WHERE booking_code = ANY($1::text[])
     ORDER BY booking_code, requested_at DESC`,
    [codes],
  );
  return result.rows.map(mapRefund);
}

export function refundEligibility(booking: Booking, pending: RefundRequest | null): {
  canRequest: boolean;
  blockReason: string | null;
} {
  if (booking.checkedInAt) {
    return {
      canRequest: false,
      blockReason: `This ticket was checked in at the hangout, so an online refund is not available. Email ${supportEmail()} and we will help resolve any issue.`,
    };
  }
  if (booking.paymentStatus === "refunded") {
    return { canRequest: false, blockReason: "This booking has already been refunded." };
  }
  if (booking.paymentStatus === "free") {
    return { canRequest: false, blockReason: "This was a free reservation, so there is nothing to refund." };
  }
  if (booking.paymentStatus !== "paid") {
    return {
      canRequest: false,
      blockReason: "We can only refund bookings that have been paid. If you have not paid yet, there is nothing to refund.",
    };
  }
  if (!booking.stripeSessionId) {
    return {
      canRequest: false,
      blockReason: `We could not find a Stripe payment for this booking. Email ${supportEmail()} for help.`,
    };
  }
  if (pending) {
    return {
      canRequest: false,
      blockReason: "A refund request for this booking is already waiting for review.",
    };
  }
  return { canRequest: true, blockReason: null };
}

export async function previewRefund(code: string): Promise<RefundPreview> {
  const booking = await getBooking(code);
  if (!booking) {
    throw new BookingError("We could not find that booking reference.", 404);
  }
  const [hangout, pending] = await Promise.all([
    getEvent(booking.eventSlug),
    getPendingRefund(booking.code),
  ]);
  const eligibility = refundEligibility(booking, pending);
  return {
    code: booking.code,
    guestName: guestName(booking),
    emailMasked: maskEmail(booking.email),
    eventName: hangout?.name ?? booking.eventSlug,
    whenLabel: hangout?.whenLabel ?? "",
    amountLabel: booking.amountPence != null ? formatGbp(booking.amountPence) : "—",
    amountPence: booking.amountPence,
    paymentStatus: booking.paymentStatus,
    checkedIn: Boolean(booking.checkedInAt),
    canRequest: eligibility.canRequest,
    blockReason: eligibility.blockReason,
    pendingRefundId: pending?.id ?? null,
  };
}

export async function createRefundRequest(code: string, reason: string) {
  const booking = await getBooking(code);
  if (!booking) {
    throw new BookingError("We could not find that booking reference.", 404);
  }
  const pending = await getPendingRefund(booking.code);
  const eligibility = refundEligibility(booking, pending);
  if (!eligibility.canRequest) {
    throw new BookingError(eligibility.blockReason ?? "This booking cannot be refunded online.", 409);
  }
  const cleanedReason = clean(reason, 500);
  if (cleanedReason.length < 8) {
    throw new BookingError("Please tell us briefly why you need a refund (at least a short sentence).", 400, "reason");
  }

  try {
    const result = await query<RefundRow>(
      `INSERT INTO refund_requests (booking_code, reason)
       VALUES ($1, $2)
       RETURNING *`,
      [booking.code, cleanedReason],
    );
    return mapRefund(result.rows[0]!);
  } catch (error) {
    const pgCode = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (pgCode === "23505") {
      throw new BookingError("A refund request for this booking is already waiting for review.", 409);
    }
    throw error;
  }
}

export async function markBookingRefunded(code: string) {
  const result = await query(
    `UPDATE bookings
     SET payment_status = 'refunded',
         checkout_url = NULL
     WHERE code = $1 AND payment_status = 'paid'
     RETURNING code`,
    [code],
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Ask Stripe whether paid bookings (especially approved refunds) have finished refunding,
 * then flip local payment_status to refunded when the charge is fully refunded.
 */
export async function syncRefundsFromStripe(limit = 25): Promise<{
  checked: number;
  updated: number;
  pendingInStripe: number;
}> {
  const { listBookings } = await import("./bookings");
  const { probeCheckoutRefundStatus, stripeConfigured } = await import("./stripe");

  if (!stripeConfigured()) {
    return { checked: 0, updated: 0, pendingInStripe: 0 };
  }

  const [approvedNeedingSync, bookings] = await Promise.all([
    listApprovedRefundsNeedingSync().catch(() => []),
    listBookings(),
  ]);
  const bookingByCode = new Map(bookings.map((booking) => [booking.code, booking]));

  const byCode = new Map<string, { code: string; stripeSessionId: string; refundId?: number }>();

  // Prefer bookings with an approved refund that still show as paid.
  for (const refund of approvedNeedingSync) {
    const booking = bookingByCode.get(refund.bookingCode);
    if (booking?.paymentStatus === "paid" && booking.stripeSessionId) {
      byCode.set(booking.code, {
        code: booking.code,
        stripeSessionId: booking.stripeSessionId,
        refundId: refund.id,
      });
    }
  }

  // Also spot-check other recent paid sessions (covers refunds done in Stripe Dashboard).
  for (const booking of bookings) {
    if (byCode.size >= limit) break;
    if (booking.paymentStatus !== "paid" || !booking.stripeSessionId) continue;
    if (byCode.has(booking.code)) continue;
    byCode.set(booking.code, {
      code: booking.code,
      stripeSessionId: booking.stripeSessionId,
    });
  }

  let checked = 0;
  let updated = 0;
  let pendingInStripe = 0;

  for (const item of Array.from(byCode.values()).slice(0, limit)) {
    checked += 1;
    const probe = await probeCheckoutRefundStatus(item.stripeSessionId);
    if (!probe) continue;

    if (probe.latestRefundStatus === "pending" || probe.latestRefundStatus === "requires_action") {
      pendingInStripe += 1;
    }

    if (!probe.fullyRefunded && !probe.hasSucceededRefund) continue;

    const changed = await markBookingRefunded(item.code);
    if (changed) {
      updated += 1;
      if (item.refundId && probe.latestRefundId) {
        await query(
          `UPDATE refund_requests
           SET stripe_refund_id = COALESCE(stripe_refund_id, $2)
           WHERE id = $1`,
          [item.refundId, probe.latestRefundId],
        ).catch(() => undefined);
      }
    }
  }

  return { checked, updated, pendingInStripe };
}

export async function approveRefundRequest(
  id: number,
  adminEmail: string,
  stripeRefundId: string,
) {
  const result = await query<RefundRow>(
    `UPDATE refund_requests
     SET status = 'approved',
         stripe_refund_id = $2,
         resolved_at = NOW(),
         resolved_by = $3
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id, stripeRefundId, adminEmail],
  );
  return result.rows[0] ? mapRefund(result.rows[0]) : null;
}

export async function rejectRefundRequest(id: number, adminEmail: string, rejectionReason: string) {
  const cleaned = clean(rejectionReason, 500);
  if (cleaned.length < 5) {
    throw new BookingError("Add a short reason for the guest.", 400, "rejectionReason");
  }
  const result = await query<RefundRow>(
    `UPDATE refund_requests
     SET status = 'rejected',
         rejection_reason = $2,
         resolved_at = NOW(),
         resolved_by = $3
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id, cleaned, adminEmail],
  );
  return result.rows[0] ? mapRefund(result.rows[0]) : null;
}
