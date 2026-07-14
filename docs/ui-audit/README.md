# TravelPacker UI audit

Headless-browser screenshot audit of the deployed app
(https://travelpacker-production.up.railway.app), captured in **desktop** and **mobile**
profiles across every route and its interactive states (modals, dropdowns, tabs, bulk-edit).

- **[NAVIGATION.md](./NAVIGATION.md)** — route map, navigation flow, per-screenshot manifest,
  and observed design-system notes.
- **[manifest.json](./manifest.json)** — machine-readable: one entry per shot
  (`profile`, `viewport`, `route`, `page`, `state`, `description`, `url`).
- **`desktop/`** (21) and **`mobile/`** (20) — the screenshots.
- **[tooling/](./tooling/)** — the capture script (`audit.cjs`), the MITM relay
  (`relay.cjs`), and **[README-approach.md](./tooling/README-approach.md)** explaining how
  Chromium was made to work through the container's egress proxy.

To reproduce or screenshot any other site from a Claude Code cloud container, use the
**`web-screenshots`** skill (`.claude/skills/web-screenshots/`), which packages the relay +
capture flow into one command.
