import { query } from "./db";
import { poundsToPence } from "./money";

export type TicketKind = "adult" | "child" | "family" | "other";

export type TicketCategory = {
  id: number;
  eventSlug: string;
  name: string;
  description: string;
  kind: TicketKind;
  pricePence: number;
  seatsPerTicket: number;
  maxPerOrder: number;
  sortOrder: number;
  active: boolean;
};

export type TicketSelection = {
  categoryId: number;
  quantity: number;
};

export type BookingItem = {
  id: number;
  bookingCode: string;
  categoryId: number | null;
  categoryName: string;
  quantity: number;
  unitPricePence: number;
  seats: number;
};

export type ResolvedTicketLine = {
  category: TicketCategory;
  quantity: number;
  seats: number;
  lineTotalPence: number;
};

type CategoryRow = {
  id: number;
  event_slug: string;
  name: string;
  description: string;
  kind: TicketKind;
  price_pence: number;
  seats_per_ticket: number;
  max_per_order: number;
  sort_order: number;
  active: boolean;
};

type ItemRow = {
  id: number;
  booking_code: string;
  category_id: number | null;
  category_name: string;
  quantity: number;
  unit_price_pence: number;
  seats: number;
};

export class TicketError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function mapCategory(row: CategoryRow): TicketCategory {
  return {
    id: row.id,
    eventSlug: row.event_slug,
    name: row.name,
    description: row.description,
    kind: row.kind,
    pricePence: row.price_pence,
    seatsPerTicket: row.seats_per_ticket,
    maxPerOrder: row.max_per_order,
    sortOrder: row.sort_order,
    active: row.active,
  };
}

function mapItem(row: ItemRow): BookingItem {
  return {
    id: row.id,
    bookingCode: row.booking_code,
    categoryId: row.category_id,
    categoryName: row.category_name,
    quantity: row.quantity,
    unitPricePence: row.unit_price_pence,
    seats: row.seats,
  };
}

export async function listCategories(eventSlug: string, activeOnly = false) {
  const result = await query<CategoryRow>(
    `SELECT * FROM ticket_categories
     WHERE event_slug = $1 ${activeOnly ? "AND active = TRUE" : ""}
     ORDER BY sort_order ASC, id ASC`,
    [eventSlug],
  );
  return result.rows.map(mapCategory);
}

export async function getCategory(id: number) {
  const result = await query<CategoryRow>("SELECT * FROM ticket_categories WHERE id = $1", [id]);
  return result.rows[0] ? mapCategory(result.rows[0]) : null;
}

export async function seedDefaultCategories(eventSlug: string) {
  const { getPool } = await import("./db");
  const pool = getPool();
  const existing = await pool.query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM ticket_categories WHERE event_slug = $1",
    [eventSlug],
  );
  if ((existing.rows[0]?.count ?? 0) > 0) return;
  const defaults: Array<[string, string, TicketKind, number, number, number]> = [
    ["Adult", "One adult place with materials and a seat at the table.", "adult", 4500, 1, 8],
    ["Child", "One child place. Only the lead booker's details are collected.", "child", 2500, 1, 8],
    ["Family", "Flat family ticket covering up to four places.", "family", 12000, 4, 2],
  ];
  for (const [index, [name, description, kind, price, seats, max]] of defaults.entries()) {
    await pool.query(
      `INSERT INTO ticket_categories
        (event_slug, name, description, kind, price_pence, seats_per_ticket, max_per_order, sort_order, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE)`,
      [eventSlug, name, description, kind, price, seats, max, index],
    );
  }
}

export type CategoryInput = {
  name: string;
  description: string;
  kind: TicketKind;
  pricePence: number;
  seatsPerTicket: number;
  maxPerOrder: number;
  sortOrder: number;
  active: boolean;
};

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function parseCategoryInput(body: unknown): CategoryInput {
  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const name = clean(source.name, 80);
  if (name.length < 2) throw new TicketError("Add a ticket name.", 400);
  const kindRaw = clean(source.kind, 20);
  const kind = (["adult", "child", "family", "other"] as const).includes(kindRaw as TicketKind)
    ? (kindRaw as TicketKind)
    : "other";
  const free = Boolean(source.isFree) || String(source.price ?? "").trim() === "0";
  let pricePence = 0;
  if (!free) {
    const parsed = poundsToPence(String(source.price ?? ""));
    if (parsed === null || parsed < 50 || parsed > 500_000) {
      throw new TicketError("Enter a ticket price between £0.50 and £5,000, or mark it free.", 400);
    }
    pricePence = parsed;
  }
  const seatsPerTicket = Number(source.seatsPerTicket);
  const maxPerOrder = Number(source.maxPerOrder);
  const sortOrder = Number(source.sortOrder ?? 0);
  if (!Number.isInteger(seatsPerTicket) || seatsPerTicket < 1 || seatsPerTicket > 12) {
    throw new TicketError("Seats per ticket must be between 1 and 12.", 400);
  }
  if (!Number.isInteger(maxPerOrder) || maxPerOrder < 1 || maxPerOrder > 20) {
    throw new TicketError("Max per order must be between 1 and 20.", 400);
  }
  return {
    name,
    description: clean(source.description, 300),
    kind,
    pricePence,
    seatsPerTicket,
    maxPerOrder,
    sortOrder: Number.isInteger(sortOrder) ? sortOrder : 0,
    active: source.active !== false,
  };
}

export async function createCategory(eventSlug: string, input: CategoryInput) {
  const result = await query<CategoryRow>(
    `INSERT INTO ticket_categories
      (event_slug, name, description, kind, price_pence, seats_per_ticket, max_per_order, sort_order, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      eventSlug,
      input.name,
      input.description,
      input.kind,
      input.pricePence,
      input.seatsPerTicket,
      input.maxPerOrder,
      input.sortOrder,
      input.active,
    ],
  );
  return mapCategory(result.rows[0]!);
}

export async function updateCategory(id: number, eventSlug: string, input: CategoryInput) {
  const result = await query<CategoryRow>(
    `UPDATE ticket_categories SET
      name = $3,
      description = $4,
      kind = $5,
      price_pence = $6,
      seats_per_ticket = $7,
      max_per_order = $8,
      sort_order = $9,
      active = $10
     WHERE id = $1 AND event_slug = $2
     RETURNING *`,
    [
      id,
      eventSlug,
      input.name,
      input.description,
      input.kind,
      input.pricePence,
      input.seatsPerTicket,
      input.maxPerOrder,
      input.sortOrder,
      input.active,
    ],
  );
  return result.rows[0] ? mapCategory(result.rows[0]) : null;
}

export async function deleteCategory(id: number, eventSlug: string) {
  await query("DELETE FROM ticket_categories WHERE id = $1 AND event_slug = $2", [id, eventSlug]);
}

export function parseSelections(body: unknown): TicketSelection[] {
  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const raw = source.tickets;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        categoryId: Number(row.categoryId),
        quantity: Number(row.quantity),
      };
    })
    .filter((item) => Number.isInteger(item.categoryId) && item.categoryId > 0 && Number.isInteger(item.quantity));
}

export function resolveSelections(categories: TicketCategory[], selections: TicketSelection[]): ResolvedTicketLine[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const lines: ResolvedTicketLine[] = [];
  for (const selection of selections) {
    if (selection.quantity <= 0) continue;
    const category = byId.get(selection.categoryId);
    if (!category || !category.active) {
      throw new TicketError("That ticket type is not available.", 400);
    }
    if (selection.quantity > category.maxPerOrder) {
      throw new TicketError(
        `You can buy at most ${category.maxPerOrder} ${category.name} ticket${category.maxPerOrder === 1 ? "" : "s"}.`,
        400,
      );
    }
    lines.push({
      category,
      quantity: selection.quantity,
      seats: selection.quantity * category.seatsPerTicket,
      lineTotalPence: selection.quantity * category.pricePence,
    });
  }
  if (lines.length === 0) {
    throw new TicketError("Choose at least one ticket.", 400);
  }
  return lines;
}

export function linesTotal(lines: ResolvedTicketLine[]) {
  return lines.reduce(
    (sum, line) => ({
      seats: sum.seats + line.seats,
      amountPence: sum.amountPence + line.lineTotalPence,
      adults: sum.adults + (line.category.kind === "child" ? 0 : line.seats),
      children: sum.children + (line.category.kind === "child" ? line.seats : 0),
    }),
    { seats: 0, amountPence: 0, adults: 0, children: 0 },
  );
}

export async function listBookingItems(code: string) {
  const result = await query<ItemRow>(
    "SELECT * FROM booking_items WHERE booking_code = $1 ORDER BY id ASC",
    [code],
  );
  return result.rows.map(mapItem);
}

export async function seatsTaken(eventSlug: string) {
  const result = await query<{ taken: number }>(
    "SELECT COALESCE(SUM(adults + children), 0)::int AS taken FROM bookings WHERE event_slug = $1",
    [eventSlug],
  );
  return result.rows[0]?.taken ?? 0;
}

export async function remainingSeats(eventSlug: string, capacity: number) {
  return Math.max(0, capacity - (await seatsTaken(eventSlug)));
}
