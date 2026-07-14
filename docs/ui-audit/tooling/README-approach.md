# How these screenshots were captured (Claude Code cloud + egress proxy)

## The problem

The Claude Code web/cloud container routes all outbound HTTPS through a local egress proxy
(`HTTPS_PROXY=http://127.0.0.1:45467`) that **re-terminates TLS** (MITM, CA bundle at
`/root/.ccr/ca-bundle.crt`). `curl` and Node `fetch()` go through it fine, but **headless
Chromium (Playwright) gets `net::ERR_CONNECTION_RESET` for every HTTPS host** — the proxy
resets Chromium's tunneled TLS handshake. Confirmed symptoms:

- `curl https://example.com` → 200 ✅
- Node `fetch('https://example.com')` (with `NODE_USE_ENV_PROXY=1`) → 200 ✅
- Chromium via `proxy.server=http://127.0.0.1:45467` → **reset for example.com, google.com,
  and the target** ❌ (so it's not the site)
- `ignoreHTTPSErrors`, forcing TLS 1.2, and disabling PostQuantumKyber did **not** help.

This is consistent with the environment's own note (`/root/.ccr/README.md`) that certain
TLS shapes aren't supported through the proxy, and headless-browser automation of external
sites is not an officially supported path here.

## The workaround: a local MITM relay

Since Node's HTTPS through the proxy works, put a tiny relay in front of Chromium:

```
Chromium  ──TLS(ignore-cert)──▶  relay.js (127.0.0.1:8899)  ──Node fetch()──▶  egress proxy  ──▶  origin
```

`relay.js` is an HTTP proxy. On `CONNECT host:443` it terminates Chromium's TLS locally with
a throwaway self-signed cert (Chromium launched with `--ignore-certificate-errors`), reads the
decrypted HTTP request, and re-issues it with Node `fetch()` — which traverses the egress
proxy successfully. Responses stream back. It's a 70-line version of `mitmproxy --mode
upstream:` / the `http-mitm-proxy` npm package.

## Quickstart

```bash
# 0) one-time: self-signed cert for the relay
openssl req -x509 -newkey rsa:2048 -keyout relay-key.pem -out relay-cert.pem \
  -days 3 -nodes -subj "/CN=screenshot-relay"

# 1) start the relay (Node's fetch must use the env proxy)
NODE_USE_ENV_PROXY=1 RELAY_PORT=8899 node relay.js &

# 2) point Chromium at it
#    proxy.server = http://127.0.0.1:8899
#    args: ['--ignore-certificate-errors'];  context: { ignoreHTTPSErrors: true }
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node audit.js
```

## Gotchas learned the hard way

- **Use the pre-installed Chromium.** `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; do **not**
  run `playwright install`. Require Playwright from the global path
  (`/opt/node22/lib/node_modules/playwright`) if it isn't a project dep.
- **Backgrounding with `&` inside a Bash tool call resets the shell CWD** for the rest of the
  command — start the relay as its own background process and run the audit separately with
  absolute paths, or you'll get `MODULE_NOT_FOUND` / missing-cert errors.
- **`EADDRINUSE` on 8899** just means a relay is already running — that's fine, reuse it.
- **WebSockets don't traverse the relay** (or the egress proxy). The app's realtime sync will
  fail during capture; page loads and screenshots are unaffected.
- Drive UI state with resilient selectors (`getByRole`) and wrap every interaction so a
  missing element is skipped, not fatal — layouts differ between desktop and mobile.
