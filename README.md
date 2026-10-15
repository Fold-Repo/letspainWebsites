# Let's All Paints

Eat, Drink & Paint reservations for Leicester, May 2027. Next.js serves the site and the API. Postgres stores bookings and the admin account. Docker runs both.

Guests enrol, choose ticket categories, and receive a QR ticket. Events, ticket types, prices and enrolment dates are managed at `/admin/events`. The May 2027 Eat, Drink & Paint hangout is seeded with Adult, Child and Family tickets the first time the app starts.

If an event takes payment straight after enrolment, the guest is sent to Stripe Checkout after the form. If payment is later, an admin emails a payment link from the reservations screen (ticket cart total, family price, or custom). Stripe takes the card. A webhook marks the enrolment paid and emails a receipt. Door staff use `/admin/check-in` to look up a code and admit once; a second scan is blocked. Sold-out is shown when capacity is full.

## Local

Requires Node 20 or newer (`nvm use`).

```bash
cp .env.example .env.local
docker compose up -d db
npm install
npm run dev
```

Open http://localhost:3010. Admin is http://localhost:3010/admin.

Postgres is published on host port 5435 so it can sit beside another database. Set `POSTGRES_PORT` if you want a different host port, and match it in `DATABASE_URL`. Inside Docker the app uses `db:5432`.

Set `ADMIN_EMAIL`, `ADMIN_PASSWORD` (8+ characters), and `ADMIN_SESSION_SECRET` before the first start. The admin row is created from those values.

## Stripe and email

Put `STRIPE_SECRET_KEY` in `.env.local`. On a paid event, set the price in the event editor. From the reservations screen, send the payment link at the standard, family, or custom amount. The link expires after 24 hours; send another if it lapses.

For local payment confirmation:

```bash
stripe listen --forward-to localhost:3010/api/stripe/webhook
```

Copy the signing secret into `STRIPE_WEBHOOK_SECRET`. Set `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` or the emails are only written to `data/outbox`.

`PUBLIC_SITE_URL` must be the origin guests use. Stripe sends them back there after payment.

## Deploy

Pushes to `main` run typecheck and a production build, publish the image to GHCR, then SSH to the server and run `docker compose pull` and `up`. Pull requests run the same typecheck and build.

On the server, once:

```bash
mkdir -p /var/www/lets-all-paints
cp .env.example /var/www/lets-all-paints/.env
# fill POSTGRES_PASSWORD, admin, Stripe, SMTP, and PUBLIC_SITE_URL
```

GitHub never overwrites that `.env`. The site listens on port 3010. Postgres is only reachable inside Docker, and its data stays in the `paints-pg` volume.

Repo secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (or `DEPLOY_SSH_PASSWORD`), `GHCR_TOKEN`, `GHCR_USERNAME`. Optional variables: `DEPLOY_PATH`, `APP_PORT`.

To build on the server instead of using the pipeline:

```bash
cp .env.example .env
docker compose up -d --build
```
