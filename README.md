# Let's All Paints

Eat, Drink & Paint reservations for Leicester, May 2027. Next.js serves the site and the API. Postgres stores bookings and the admin account. Docker runs both.

Guests enrol and receive a voucher. Events, prices and enrolment dates are managed at `/admin/events`. The May 2027 Eat, Drink & Paint hangout is created the first time the app starts. Edit its enrolment end date, mark it free or paid, set the price per person, and optionally set a flat family or group price.

If an event takes payment straight after enrolment, the guest is sent to Stripe after the form. If payment is later, an admin emails a payment link from the reservations screen. That link can use the standard total, the family or group price, or a custom amount for that party. Stripe takes the card. A webhook marks the enrolment paid and emails a receipt.

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

```bash
cp .env.example .env
# fill admin, Stripe, SMTP, and PUBLIC_SITE_URL
docker compose up -d --build
```

The site listens on port 3010. Postgres data stays in the `paints-pg` volume. Tables are created when the app starts.
