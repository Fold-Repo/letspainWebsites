import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { query } from "./db";
import { hashPassword } from "./password";
import { isAdminRole, type AdminRole } from "./roles";

export class AdminError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type AdminRecord = {
  id: number;
  email: string;
  role: AdminRole;
  mfaEnabled: boolean;
  passwordHash: string;
  mfaSecretEnc: string | null;
};

type Row = {
  id: number;
  email: string;
  role: string;
  password_hash: string;
  mfa_enabled: boolean;
  mfa_secret_enc: string | null;
};

function mapAdmin(row: Row): AdminRecord {
  return {
    id: row.id,
    email: row.email,
    role: isAdminRole(row.role) ? row.role : "editor",
    mfaEnabled: row.mfa_enabled,
    passwordHash: row.password_hash,
    mfaSecretEnc: row.mfa_secret_enc,
  };
}

function key() {
  return createHash("sha256")
    .update(process.env.ADMIN_SESSION_SECRET || "dev-only-admin-session-secret-change-me")
    .digest();
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(payload: string) {
  const [ivPart, tagPart, dataPart] = payload.split(".");
  if (!ivPart || !tagPart || !dataPart) throw new Error("Invalid MFA secret.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function getAdminByEmail(email: string) {
  const result = await query<Row>(
    "SELECT id, email, role, password_hash, mfa_enabled, mfa_secret_enc FROM admins WHERE email = $1",
    [email.trim().toLowerCase()],
  );
  return result.rows[0] ? mapAdmin(result.rows[0]) : null;
}

export async function setAdminMfa(email: string, secret: string | null, enabled: boolean) {
  await query(
    `UPDATE admins
     SET mfa_secret_enc = $2, mfa_enabled = $3
     WHERE email = $1`,
    [email, secret ? encryptSecret(secret) : null, enabled],
  );
}

export async function updateAdminRole(email: string, role: AdminRole) {
  await query("UPDATE admins SET role = $2 WHERE email = $1", [email, role]);
}

export async function createAdmin(input: { email: string; password: string; role: AdminRole }) {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AdminError("Enter a valid email.", 400);
  }
  if (password.length < 8) {
    throw new AdminError("Password must be at least 8 characters.", 400);
  }
  if (!isAdminRole(input.role)) {
    throw new AdminError("Choose a valid role.", 400);
  }
  const existing = await getAdminByEmail(email);
  if (existing) {
    throw new AdminError("That email is already an admin.", 409);
  }
  const passwordHash = await hashPassword(password);
  try {
    await query("INSERT INTO admins (email, password_hash, role) VALUES ($1, $2, $3)", [
      email,
      passwordHash,
      input.role,
    ]);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "23505") {
      throw new AdminError("That email is already an admin.", 409);
    }
    throw error;
  }
  return { email, role: input.role, mfaEnabled: false };
}

export async function listAdmins() {
  const result = await query<Row>(
    "SELECT id, email, role, password_hash, mfa_enabled, mfa_secret_enc FROM admins ORDER BY email ASC",
  );
  return result.rows.map(mapAdmin);
}
