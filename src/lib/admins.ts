import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { query } from "./db";
import { isAdminRole, type AdminRole } from "./roles";

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

export async function listAdmins() {
  const result = await query<Row>(
    "SELECT id, email, role, password_hash, mfa_enabled, mfa_secret_enc FROM admins ORDER BY email ASC",
  );
  return result.rows.map(mapAdmin);
}
