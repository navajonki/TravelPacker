# Deploying TravelPacker on Railway

This app was migrated off Replit. It runs as a **single Railway service**
(Express serves both the API and the built React client on one port) plus a
**Railway Postgres** plugin. WebSockets (`/ws`) and HTTP share the same port.

## What's already wired up

- `railway.json` pins the Nixpacks build (`npm run build`) and start
  (`npm run start`) commands, a `/api/health` health check, and a restart policy.
- `server/index.ts` reads `PORT` (injected by Railway), binds `0.0.0.0`, and runs
  Drizzle migrations on boot (`NODE_ENV=production`). Migrations now **hard-fail
  the boot** on error so a broken deploy is caught by the health check.
- `server/db.ts` is SSL-tolerant (`getPostgresSsl`): plaintext for the Railway
  private network (`*.railway.internal`) / localhost, `ssl: require` otherwise.
- All schema is created by the journaled migrations in `migrations/` — including
  `password_reset_tokens` (0002) and `items.packing_list_id` (0003), which were
  previously only applied by un-journaled scripts and would break a fresh DB.

## 1. Provision (one-time, via Railway CLI)

```bash
npm i -g @railway/cli
export RAILWAY_TOKEN=<your account token>      # railway.com → Account → Tokens

railway init --name travelpacker               # create the project
railway add --database postgres                # add the Postgres plugin
# Link the service, then set variables:
railway variables --set "DATABASE_URL=\${{Postgres.DATABASE_URL}}" \
                  --set "SESSION_SECRET=$(openssl rand -hex 32)" \
                  --set "MAILJET_API_KEY=<key>" \
                  --set "MAILJET_SECRET_KEY=<secret>" \
                  --set "MAILJET_SENDER_EMAIL=<verified sender>"
railway up                                      # build + deploy
railway domain                                  # generate a public https domain
```

> **Do NOT set `NODE_ENV` as a Railway variable.** It would prune devDependencies
> at install time and the build (`vite`/`esbuild`) would fail. The `start` script
> sets `NODE_ENV=production` at runtime only.
>
> Use the **internal** `DATABASE_URL` reference (`${{Postgres.DATABASE_URL}}`) —
> no SSL, no egress cost. The public `DATABASE_PUBLIC_URL` also works thanks to
> the SSL-tolerant code, but is only needed for external tools (see step 3).

Verify: `curl https://<app>.up.railway.app/api/health` → `{"status":"ok"}`.

## 2. Email (Mailjet)

Mailjet is the production email provider (free tier, already coded in
`server/mailjetService.ts`). Verify a sender address in the Mailjet dashboard
(e.g. `zjbodnar@gmail.com`) and set the three `MAILJET_*` variables above.
Without them the app still boots; invitation/password-reset emails just no-op.

## 3. Migrate users + data from Replit

Run **after** the first deploy (so startup migrations have created the schema):

```bash
SOURCE_DATABASE_URL="<Replit Postgres URL>" \
TARGET_DATABASE_URL="$(railway variables --kv | grep DATABASE_PUBLIC_URL | cut -d= -f2-)" \
./scripts/migrate-from-replit.sh
```

This dumps **data only** (schema already exists), restores FK-safely with
`--disable-triggers`, fixes serial sequences, and verifies per-table row counts.
bcrypt password hashes are copied verbatim, so **users keep their passwords**.
The `session` table is intentionally skipped (users just log in again once).

## 4. Verify end-to-end

```bash
BASE_URL=https://<app>.up.railway.app node scripts/integration-test.mjs
```

Covers: register/login, list + traveler/category/bag create & edit, items,
invitation create→accept across two users, bidirectional real-time WebSocket
sync, and access control. For UI/browser verification use the Playwright spec
under `tests/e2e/` (if present) or drive the app manually.

## Continuous deploys

Connect the GitHub repo to the Railway service (dashboard → service → Settings →
Source) so pushes to the deploy branch auto-build. `railway.json` makes every
build reproducible.
