import { Pool, type QueryResultRow } from "pg";
import { hashPassword, verifyPassword } from "./password";

const globalForPg = globalThis as unknown as { pool?: Pool; ready?: Promise<void>; schemaVersion?: number };

const schemaVersion = 8;

export function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }
  if (!globalForPg.pool) {
    globalForPg.pool = new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 5000,
    });
  }
  return globalForPg.pool;
}

const schema = `
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  code TEXT PRIMARY KEY,
  event_slug TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  adults INTEGER NOT NULL,
  children INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  amount_pence INTEGER,
  currency TEXT NOT NULL DEFAULT 'gbp',
  stripe_session_id TEXT,
  checkout_url TEXT,
  paid_at TIMESTAMPTZ,
  CONSTRAINT bookings_event_email UNIQUE (event_slug, email),
  CONSTRAINT bookings_email_status CHECK (email_status IN ('pending', 'sent', 'unconfigured', 'failed')),
  CONSTRAINT bookings_payment_status CHECK (payment_status IN ('unpaid', 'link_sent', 'paid'))
);

CREATE INDEX IF NOT EXISTS bookings_created_at_idx ON bookings (created_at DESC);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pricing_choice TEXT NOT NULL DEFAULT 'per_person';
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_pricing_choice;
ALTER TABLE bookings ADD CONSTRAINT bookings_pricing_choice CHECK (pricing_choice IN ('per_person', 'family', 'custom'));
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status CHECK (payment_status IN ('unpaid', 'link_sent', 'paid', 'free'));

CREATE TABLE IF NOT EXISTS events (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  venue TEXT NOT NULL DEFAULT '',
  when_label TEXT NOT NULL DEFAULT '',
  time_label TEXT NOT NULL DEFAULT '',
  story TEXT NOT NULL DEFAULT '',
  inclusions TEXT NOT NULL DEFAULT '',
  capacity INTEGER NOT NULL DEFAULT 80,
  enrollment_starts_at TIMESTAMPTZ NOT NULL,
  enrollment_ends_at TIMESTAMPTZ NOT NULL,
  is_free BOOLEAN NOT NULL DEFAULT FALSE,
  price_pence INTEGER,
  family_price_pence INTEGER,
  payment_timing TEXT NOT NULL DEFAULT 'later',
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT events_payment_timing CHECK (payment_timing IN ('now', 'later')),
  CONSTRAINT events_enrollment CHECK (enrollment_ends_at > enrollment_starts_at)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partnerships (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  organisation TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  website TEXT NOT NULL DEFAULT '',
  email_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT partnerships_category CHECK (category IN ('sponsor', 'vendor', 'artist', 'community', 'other')),
  CONSTRAINT partnerships_email_status CHECK (email_status IN ('pending', 'sent', 'unconfigured', 'failed'))
);

CREATE INDEX IF NOT EXISTS partnerships_created_at_idx ON partnerships (created_at DESC);

CREATE TABLE IF NOT EXISTS ticket_categories (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_slug TEXT NOT NULL REFERENCES events(slug) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'other',
  price_pence INTEGER NOT NULL DEFAULT 0,
  seats_per_ticket INTEGER NOT NULL DEFAULT 1,
  max_per_order INTEGER NOT NULL DEFAULT 8,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT ticket_categories_kind CHECK (kind IN ('adult', 'child', 'family', 'other')),
  CONSTRAINT ticket_categories_seats CHECK (seats_per_ticket >= 1 AND seats_per_ticket <= 12),
  CONSTRAINT ticket_categories_max CHECK (max_per_order >= 1 AND max_per_order <= 20),
  CONSTRAINT ticket_categories_price CHECK (price_pence >= 0)
);

CREATE INDEX IF NOT EXISTS ticket_categories_event_idx ON ticket_categories (event_slug, sort_order, id);

CREATE TABLE IF NOT EXISTS booking_items (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  booking_code TEXT NOT NULL REFERENCES bookings(code) ON DELETE CASCADE,
  category_id INTEGER,
  category_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_pence INTEGER NOT NULL,
  seats INTEGER NOT NULL,
  CONSTRAINT booking_items_qty CHECK (quantity >= 1)
);

CREATE INDEX IF NOT EXISTS booking_items_code_idx ON booking_items (booking_code);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checked_in_by TEXT;

ALTER TABLE admins ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'owner';
ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_role;
ALTER TABLE admins ADD CONSTRAINT admins_role CHECK (role IN ('owner', 'editor', 'door'));
ALTER TABLE admins ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS mfa_secret_enc TEXT;

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS consent_records (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  visitor_key TEXT NOT NULL,
  essential BOOLEAN NOT NULL DEFAULT TRUE,
  analytics BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS consent_records_created_at_idx ON consent_records (created_at DESC);
`;

async function syncAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || !password) return;
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }
  const pool = getPool();
  const hash = await hashPassword(password);
  const roleEnv = (process.env.ADMIN_ROLE ?? "owner").trim().toLowerCase();
  const role = roleEnv === "editor" || roleEnv === "door" ? roleEnv : "owner";
  const existing = await pool.query<{ password_hash: string; role: string }>(
    "SELECT password_hash, role FROM admins WHERE email = $1",
    [email],
  );
  if (existing.rowCount === 0) {
    try {
      await pool.query("INSERT INTO admins (email, password_hash, role) VALUES ($1, $2, $3)", [
        email,
        hash,
        role,
      ]);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (code !== "23505") throw error;
    }
    return;
  }
  const current = existing.rows[0]?.password_hash ?? "";
  if (!(await verifyPassword(password, current))) {
    await pool.query("UPDATE admins SET password_hash = $2 WHERE email = $1", [email, hash]);
  }
}

export async function ensureDatabase() {
  await getPool().query(schema);
  await syncAdmin();
  const { seedFeaturedEvent } = await import("./events");
  await seedFeaturedEvent();
}

export function readyDatabase() {
  if (globalForPg.schemaVersion !== schemaVersion) {
    globalForPg.ready = undefined;
    globalForPg.schemaVersion = schemaVersion;
  }
  globalForPg.ready ??= ensureDatabase().catch((error: unknown) => {
    globalForPg.ready = undefined;
    globalForPg.schemaVersion = undefined;
    throw error;
  });
  return globalForPg.ready;
}

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  await readyDatabase();
  return getPool().query<T>(text, values);
}
