# Railway Operations (READ FIRST before any deploy or DB work)

This app is **already deployed and live on Railway** and **auto-deploys on every
push/merge to `main`** via the connected GitHub repo. In almost all cases you do
**not** provision anything — you push to `main` and Railway builds + deploys.

- **Live URL:** https://travelpacker-production.up.railway.app
- **Repo:** `navajonki/TravelPacker` (default branch `main`)
- For first-time/scratch provisioning only, see `RAILWAY_DEPLOY.md`. This file is
  about operating the **existing** deployment.

## The deployment at a glance

| Thing | Value |
|---|---|
| Railway project | `travelpacker` — id `3e34985d-6466-403c-b2b7-2620bcf021e4` |
| Environment | `production` — id `aee3f889-a7c9-4bdf-9c9b-d6832b132253` |
| App service | `travelpacker` — id `fff3e3c8-6fe7-4467-941e-e029d3545989` |
| Postgres service | `Postgres` — id `6a69f396-1fcd-4d5a-8116-faae8af98fe2` |
| DB volume mount | `/var/lib/postgresql/data` (one volume, attached to Postgres) |
| Build/deploy config | `railway.json` (Nixpacks, `npm run build` / `npm run start`, healthcheck `/api/health`) |
| Source of truth | `main` → GitHub integration → auto-deploy |

The app is a single service: Express serves the API, the built React client, and
the `/ws` WebSocket on one port. Postgres is a separate Railway service reached
over the **private network** (`postgres.railway.internal:5432`, db `railway`).

## How to deploy a change

**Just push to `main`.** Open a PR from your working branch → merge → Railway
auto-builds and deploys. Verify with:
```bash
curl -s https://travelpacker-production.up.railway.app/api/health   # -> {"status":"ok"}
BASE_URL=https://travelpacker-production.up.railway.app node scripts/integration-test.mjs
```
Manual deploy (rarely needed): `railway up --service travelpacker --detach` using a
**project token** (see "Railway API access").

## Environment variables (set on Railway, NOT in the repo)

App service: `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (internal ref),
`SESSION_SECRET`, `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `MAILJET_SENDER_EMAIL`.
- **Do NOT set `NODE_ENV`** as a Railway variable — it prunes devDependencies at
  install time and the build (`vite`/`esbuild`) fails. `npm run start` sets it at
  runtime only.
- **Do NOT set `PORT`** — Railway injects it.
- Secrets (DB password, Mailjet keys, tokens, the Neon source URL) live only in
  Railway / the session env. Never commit them.

## Railway API access (important: the CLI is limited here)

The account API token (`RAILWAY_ACCOUNT_API_TOKEN` in the cloud-session env) works
against the **GraphQL API** (`https://backboard.railway.com/graphql/v2`, header
`Authorization: Bearer <token>`) for project/service mutations, but it **cannot**
query `me`, so the Railway **CLI's account commands fail** (`whoami`, `list`,
`link`, interactive `add`). Consequences:
- Do infra ops (provision, variables, domains, redeploys, volumes, backups schedule)
  via **GraphQL**, not the CLI.
- For `railway up` (code upload) you need a **project-scoped token**: mint one with
  the `projectTokenCreate` mutation, then `RAILWAY_TOKEN=<project-token> railway up`.
- GraphQL helper that works through the sandbox proxy (curl, not Python — Python's
  urllib bypasses the proxy and hits a Cloudflare 1010 block):
  ```bash
  rwq() { curl -s -H "Authorization: Bearer $RAILWAY_ACCOUNT_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data "$(python3 -c 'import json,sys;print(json.dumps({"query":sys.argv[1],"variables":json.loads(sys.argv[2] or "{}")}))' "$1" "${2:-}")" \
    https://backboard.railway.com/graphql/v2; }
  ```

## Database operations — the sandbox CANNOT reach Postgres over TCP

Outbound TCP to Postgres (both the Railway public proxy **and** Neon) is blocked
from the cloud sandbox — only HTTPS-via-proxy works. So `psql`/`pg_dump` against
those hosts will hang. **Run any DB migration/restore from *inside* Railway** as a
one-off service:

1. Minimal dir with `scripts/copy-db.mjs`, a `package.json`
   (`{"type":"module","dependencies":{"postgres":"^3.4.5"},"scripts":{"start":"node copy-db.mjs"}}`),
   and a `railway.json` (`startCommand: "node copy-db.mjs"`, `restartPolicyType: "NEVER"`).
2. Create a `migrator` service, set `SOURCE_DATABASE_URL` + `TARGET_DATABASE_URL`
   (`${{Postgres.DATABASE_URL}}`), `railway up --service migrator`, read its
   deployment logs, then delete the service. `copy-db.mjs` copies by column
   intersection, preserves ids, fixes sequences, and verifies row counts.

Schema is created automatically by the app's **startup migrations** (Drizzle,
`migrations/`, run only when `NODE_ENV=production`, i.e. on Railway). Migrations
**hard-fail the boot** on error so bad deploys are caught by the healthcheck.

## Gotchas

- **Internal `DATABASE_URL` = no SSL; public/Neon = SSL.** `server/db.ts`
  (`getPostgresSsl`) handles both; the app uses the internal ref.
- **Links use the request host.** Password-reset/invite URLs are built from
  `req.get('host')` / `window.location.origin`, and `trust proxy` is set so
  `req.protocol` is `https`. No hardcoded domains → they follow whatever domain
  serves the request (Railway, or a future custom domain).
- **Local prod-build testing** (`NODE_ENV=production` over local http): send
  `X-Forwarded-Proto: https` so express-session issues the `Secure` cookie
  (see `scripts/integration-test.mjs`).
- **Headless browser tests** need `proxy: { server: process.env.HTTPS_PROXY }`,
  `ignoreHTTPSErrors: true`, and `executablePath` pointing at
  `/opt/pw-browsers/chromium-*/chrome-linux/chrome`.

## Incident learnings (please heed)

- **Never delete Railway volumes/services casually.** Deleting the Postgres
  volume during a cleanup destroyed the live DB (it was recovered by re-copying
  from Neon). A `volumeDelete` on an attached volume can appear to no-op while it
  is still listed, then take effect later. Confirm volume↔service mapping via
  `volumeInstances { serviceId }` before deleting anything, and ask the user first.
- **Backups:** enable Railway's native volume backups in the dashboard
  (Postgres service → Backups). API tokens are **not authorized** for the backup
  schedule mutation, so it must be done in an owner browser session. The Neon DB
  still holds the original migration snapshot as a fallback source.

## Recovery cheat-sheet (DB down / `ENOTFOUND postgres.railway.internal`)

Means the Postgres service/volume is down. If the volume was lost:
`volumeCreate` (mount `/var/lib/postgresql/data`, serviceId = Postgres) →
`serviceInstanceDeploy` Postgres → `serviceInstanceRedeploy` the app (re-runs
migrations to rebuild schema) → run the `migrator` (copy-db.mjs) to restore data
from Neon → verify `curl /api/health` and that login returns 401 (not 500).
