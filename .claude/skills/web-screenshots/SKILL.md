---
name: web-screenshots
description: >-
  Capture headless-browser screenshots of a live/deployed website (or any external
  HTTPS site) from inside a Claude Code cloud/web container. Use this whenever you need
  to screenshot, visually audit, or drive a UI at a real URL and Chromium/Playwright
  fails with net::ERR_CONNECTION_RESET through the egress proxy. Packages a local MITM
  relay + a one-command capture script that works around the proxy's TLS reset. Triggers:
  "screenshot the site", "visual audit", "capture the deployed app", "playwright against
  the URL", "browser automation of an external site".
---

# web-screenshots

Capture screenshots of an external HTTPS site from a Claude Code cloud container.

## Why this exists (read first)

The cloud container sends outbound HTTPS through an egress proxy (`HTTPS_PROXY`,
`http://127.0.0.1:45467`) that re-terminates TLS. `curl` and Node `fetch()` work through it,
but **headless Chromium gets `net::ERR_CONNECTION_RESET` for every HTTPS host** when pointed
at that proxy — the proxy resets Chromium's tunneled TLS. `ignoreHTTPSErrors`, forcing
TLS 1.2, and disabling post-quantum key agreement do **not** fix it.

Workaround: route Chromium through a tiny **local MITM relay** that terminates Chromium's TLS
locally and re-issues each request via Node `fetch()` (which the egress proxy accepts):

```
Chromium ──TLS(ignore-cert)──▶ relay.js (127.0.0.1:8899) ──Node fetch()──▶ egress proxy ──▶ origin
```

`capture.cjs` does all of this for you (generates the cert, starts the relay, drives Chromium).

> Scripts use the `.cjs` extension on purpose: this repo's `package.json` sets
> `"type": "module"`, so a `.js` file would be treated as ESM and `require(...)` would throw.

## Quickstart

```bash
cd .claude/skills/web-screenshots

# Screenshot one or more URLs in both desktop (1440x900) and mobile (390x844):
node capture.cjs https://example.com https://example.com/pricing

# Output: ./out/desktop/*.png, ./out/mobile/*.png, ./out/manifest.json
```

Options via env vars:
- `PROFILES=desktop` (or `mobile`, or `desktop,mobile` — default both)
- `OUT_DIR=/path/to/out`
- `FULL_PAGE=0` to capture viewport-only instead of full page

For authenticated flows or clicking through modals/tabs, copy `capture.cjs` and add your own
Playwright steps — the important part (relay + launch flags) is already wired:

```js
const browser = await chromium.launch({
  headless: true,
  proxy: { server: 'http://127.0.0.1:8899' },  // the relay, NOT the egress proxy
  args: ['--ignore-certificate-errors'],
});
const context = await browser.newContext({ ignoreHTTPSErrors: true, /* viewport... */ });
```

## Gotchas (already handled by capture.js, but know them)

- **Use the pre-installed Chromium**: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`. Never run
  `playwright install`. Playwright is required from the global path
  (`/opt/node22/lib/node_modules/playwright`).
- **Never point Chromium at `HTTPS_PROXY` (45467) directly** — that's the reset. Point it at
  the relay (8899).
- **The relay needs `NODE_USE_ENV_PROXY=1`** so its Node `fetch()` uses the egress proxy.
- **`EADDRINUSE` on 8899** = a relay is already running; reuse it (capture.js detects this).
- **Don't background the relay with `&` in the same Bash call as other commands** — that resets
  the shell CWD. capture.cjs spawns it as a managed child process instead.
- **WebSockets don't traverse the proxy/relay** — realtime features won't connect during
  capture; page loads and screenshots are unaffected.

## Files

- `capture.cjs` — self-contained: cert + relay + Chromium capture for any URLs.
- `relay.cjs` — the MITM relay (used by capture.cjs; can also run standalone).
