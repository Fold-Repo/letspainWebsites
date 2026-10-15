import { query } from "./db";

export type AuditEntry = {
  id: number;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  detail: string;
  createdAt: string;
};

type Row = {
  id: number;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  detail: string;
  created_at: Date;
};

export async function writeAudit(input: {
  actorEmail: string;
  action: string;
  entityType?: string;
  entityId?: string;
  detail?: string;
}) {
  await query(
    `INSERT INTO audit_logs (actor_email, action, entity_type, entity_id, detail)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      input.actorEmail,
      input.action.slice(0, 80),
      (input.entityType ?? "").slice(0, 80),
      (input.entityId ?? "").slice(0, 120),
      (input.detail ?? "").slice(0, 1000),
    ],
  );
}

export async function listAuditLogs(limit = 100) {
  const result = await query<Row>(
    "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1",
    [Math.min(Math.max(limit, 1), 500)],
  );
  return result.rows.map(
    (row): AuditEntry => ({
      id: row.id,
      actorEmail: row.actor_email,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      detail: row.detail,
      createdAt: new Date(row.created_at).toISOString(),
    }),
  );
}
