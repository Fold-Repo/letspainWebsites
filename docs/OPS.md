# Operations — Let's All Paints

## Environments

| Env | Purpose | Notes |
| --- | --- | --- |
| Local | Dev on `:3010` | Postgres via Docker Compose on host port `5435`. |
| Staging | Pre-release smoke | Same image as production; separate `DATABASE_URL`, Stripe test keys, and `PUBLIC_SITE_URL`. |
| Production | Live bookings | Stripe live keys, strong `ADMIN_SESSION_SECRET`, HTTPS only. |

Promote staging → production only after: booking + Stripe webhook, admin login (with MFA if enabled), check-in, and partnership form.

## Secrets

- `ADMIN_SESSION_SECRET` ≥ 32 characters (also derives MFA secret encryption).
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` create the bootstrap owner on first startup only (skipped if that email already exists).
- `ADMIN_ROLE` optional seed role: `owner` (default), `editor`, or `door`.
- Never commit `.env.local`. Rotate Stripe and SMTP credentials if they leak.

## Roles

- **Owner** — events, bookings, partnerships, check-in, payment links, MFA/settings, audit.
- **Editor** — events, bookings, partnerships, check-in, payment links.
- **Door** — check-in only (`/admin/check-in`).

Extra admins: create them under **Users** (email, temporary password, role). The bootstrap owner is created once from `ADMIN_EMAIL` / `ADMIN_PASSWORD`; password resets after that happen in the Users UI, not via env.

## MFA

Owners enable TOTP under `/admin/settings`. After enable, login is password then 6-digit code. Disable from the same page if a device is lost (owner access required).

## Backups

1. Nightly `pg_dump` of the Postgres volume (or managed backup if using a cloud DB).
2. Retain at least 7 daily + 4 weekly dumps encrypted off-box.
3. Test restore on staging quarterly: create DB → restore dump → boot app → spot-check a booking code.
4. Keep `data/outbox` (dev mail) out of production backups if unused.

Example dump:

```bash
docker compose exec -T db pg_dump -U paints letsallpaints > backup-$(date +%F).sql
```

## Uptime and monitoring

- Health: hit `/` and `/api/health` (if present) or a simple GET to `/events` from uptime (UptimeRobot, Better Stack, etc.).
- Alert on 5xx rate, Postgres disk, and Stripe webhook failures.
- Watch admin audit log after door shifts for unexpected check-ins.

## Staging checklist

- [ ] `PUBLIC_SITE_URL` points at staging
- [ ] Stripe test mode + webhook forwarding
- [ ] SMTP test or outbox review
- [ ] Owner MFA enabled on a non-prod account
- [ ] Door role can check in but cannot open Reservations
- [ ] Cookie banner records consent; privacy page current

## Incident notes

- Compromised admin password: reset it in **Users**, or update `password_hash` in SQL; force MFA on; review `audit_logs`.
- Stripe webhook gap: reconcile unpaid bookings against Dashboard sessions, then re-send payment links if needed.
