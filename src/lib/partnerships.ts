import { query } from "./db";
import { categoryLabel, partnershipCategories, type PartnershipCategory } from "./partnership-categories";

export { categoryLabel, partnershipCategories };
export type { PartnershipCategory };

export type Partnership = {
  id: number;
  name: string;
  organisation: string;
  email: string;
  phone: string;
  category: PartnershipCategory;
  message: string;
  website: string;
  emailStatus: "pending" | "sent" | "unconfigured" | "failed";
  createdAt: string;
};

export class PartnershipError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly field?: string,
  ) {
    super(message);
  }
}

type Row = {
  id: number;
  name: string;
  organisation: string;
  email: string;
  phone: string;
  category: PartnershipCategory;
  message: string;
  website: string;
  email_status: Partnership["emailStatus"];
  created_at: Date;
};

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function isCategory(value: string): value is PartnershipCategory {
  return (partnershipCategories as readonly string[]).includes(value);
}

export function parsePartnership(body: unknown) {
  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const openedAt = Number(source.openedAt);
  return {
    name: clean(source.name, 80),
    organisation: clean(source.organisation, 120),
    email: clean(source.email, 120).toLowerCase(),
    phone: clean(source.phone, 30),
    category: clean(source.category, 20),
    message: String(source.message ?? "").trim().slice(0, 2000),
    website: clean(source.website, 300),
    privacyAccepted: Boolean(source.privacyAccepted),
    company: clean(source.company, 80),
    openedAt: Number.isFinite(openedAt) ? openedAt : 0,
  };
}

function websiteOk(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function createPartnership(input: ReturnType<typeof parsePartnership>) {
  if (input.company) {
    throw new PartnershipError("Thanks. We have your enquiry.", 200);
  }
  const elapsed = Date.now() - input.openedAt;
  if (!input.openedAt || elapsed < 2500 || elapsed > 12 * 60 * 60 * 1000) {
    throw new PartnershipError("Refresh the page, wait a moment, and send the form again.", 400);
  }
  if (input.name.length < 2) {
    throw new PartnershipError("Add your name.", 400, "name");
  }
  if (input.organisation.length < 2) {
    throw new PartnershipError("Add the organisation.", 400, "organisation");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new PartnershipError("Add a valid email.", 400, "email");
  }
  if (input.phone && !/^[0-9+().\-\s]{7,30}$/.test(input.phone)) {
    throw new PartnershipError("Check the phone number, or leave it blank.", 400, "phone");
  }
  if (!isCategory(input.category)) {
    throw new PartnershipError("Choose an enquiry category.", 400, "category");
  }
  if (input.message.length < 20) {
    throw new PartnershipError("Add a message of at least a few sentences.", 400, "message");
  }
  if ((input.message.match(/https?:\/\//gi) ?? []).length > 3) {
    throw new PartnershipError("Remove extra links from the message and keep the website field for your URL.", 400, "message");
  }
  if (!websiteOk(input.website)) {
    throw new PartnershipError("Add a full website or social link, starting with https://, or leave it blank.", 400, "website");
  }
  if (!input.privacyAccepted) {
    throw new PartnershipError("Please acknowledge the privacy notice.", 400, "privacyAccepted");
  }

  const recent = await query(
    "SELECT id FROM partnerships WHERE email = $1 AND created_at > NOW() - INTERVAL '15 minutes'",
    [input.email],
  );
  if ((recent.rowCount ?? 0) > 0) {
    throw new PartnershipError("We already have a recent enquiry from this email. We will reply to that one.", 429, "email");
  }

  const saved = await query<Row>(
    `INSERT INTO partnerships (name, organisation, email, phone, category, message, website)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [input.name, input.organisation, input.email, input.phone, input.category, input.message, input.website],
  );
  return mapPartnership(saved.rows[0]!);
}

export async function markPartnershipEmail(id: number, emailStatus: Partnership["emailStatus"]) {
  await query("UPDATE partnerships SET email_status = $2 WHERE id = $1", [id, emailStatus]);
}

export async function listPartnerships() {
  const result = await query<Row>("SELECT * FROM partnerships ORDER BY created_at DESC");
  return result.rows.map(mapPartnership);
}

function mapPartnership(row: Row): Partnership {
  return {
    id: row.id,
    name: row.name,
    organisation: row.organisation,
    email: row.email,
    phone: row.phone,
    category: row.category,
    message: row.message,
    website: row.website,
    emailStatus: row.email_status,
    createdAt: new Date(row.created_at).toISOString(),
  };
}
