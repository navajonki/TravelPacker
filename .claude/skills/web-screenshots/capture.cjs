#!/usr/bin/env node
// Self-contained screenshot capture for a Claude Code cloud container behind the egress
// proxy. Generates a throwaway cert, starts the MITM relay (relay.js), launches the
// pre-installed Chromium through it, and screenshots each URL in desktop + mobile.
//
// Usage:
//   node capture.js <url> [url2 ...]
// Env:
//   PROFILES=desktop,mobile   (default both)
//   OUT_DIR=./out             (default ./out under this dir)
//   FULL_PAGE=1               (default 1; set 0 for viewport-only)
//   RELAY_PORT=8899
//
// Why the relay: the container's HTTPS_PROXY re-terminates TLS and RESETS Chromium's
// tunneled handshake (curl/Node fetch are fine). The relay re-issues requests via Node
// fetch(), which the proxy accepts. See SKILL.md.
const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

const PW = '/opt/node22/lib/node_modules/playwright';
const DIR = __dirname;
const PORT = Number(process.env.RELAY_PORT || 8899);
const OUT = process.env.OUT_DIR || path.join(DIR, 'out');
const FULL_PAGE = process.env.FULL_PAGE !== '0';
const PROFILE_NAMES = (process.env.PROFILES || 'desktop,mobile').split(',').map((s) => s.trim());

const PROFILE_DEFS = {
  desktop: { viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true },
  mobile: {
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    ignoreHTTPSErrors: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
      '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
};

const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.error('usage: node capture.js <url> [url2 ...]');
  process.exit(1);
}

function portInUse(port) {
  return new Promise((resolve) => {
    const s = net.connect({ host: '127.0.0.1', port }, () => { s.destroy(); resolve(true); });
    s.on('error', () => resolve(false));
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ensureCert() {
  const key = path.join(DIR, 'relay-key.pem');
  const crt = path.join(DIR, 'relay-cert.pem');
  if (fs.existsSync(key) && fs.existsSync(crt)) return;
  console.log('generating throwaway relay cert...');
  const r = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-keyout', key,
    '-out', crt, '-days', '3', '-nodes', '-subj', '/CN=screenshot-relay'], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('openssl cert generation failed');
}

async function ensureRelay() {
  if (await portInUse(PORT)) { console.log(`relay already on :${PORT}, reusing`); return null; }
  ensureCert();
  const child = spawn(process.execPath, [path.join(DIR, 'relay.cjs')], {
    env: { ...process.env, NODE_USE_ENV_PROXY: '1', RELAY_PORT: String(PORT) },
    stdio: 'ignore', detached: false,
  });
  for (let i = 0; i < 25; i++) { if (await portInUse(PORT)) break; await sleep(200); }
  if (!(await portInUse(PORT))) throw new Error('relay failed to start');
  console.log(`relay started on :${PORT}`);
  return child;
}

function slug(u) {
  return u.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60) || 'page';
}

(async () => {
  const relay = await ensureRelay();
  const { chromium } = require(PW);
  const manifest = [];
  const browser = await chromium.launch({
    headless: true, proxy: { server: `http://127.0.0.1:${PORT}` }, args: ['--ignore-certificate-errors'],
  });
  try {
    for (const name of PROFILE_NAMES) {
      const def = PROFILE_DEFS[name];
      if (!def) { console.error(`unknown profile: ${name}`); continue; }
      const dir = path.join(OUT, name);
      fs.mkdirSync(dir, { recursive: true });
      const context = await browser.newContext(def);
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      let i = 0;
      for (const url of urls) {
        i++;
        const file = `${String(i).padStart(2, '0')}-${slug(url)}.png`;
        try {
          await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        } catch (e) {
          try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }); } catch (_) {}
        }
        await page.waitForTimeout(600);
        try { await page.screenshot({ path: path.join(dir, file), fullPage: FULL_PAGE }); }
        catch (e) { await page.screenshot({ path: path.join(dir, file) }); }
        manifest.push({ screenshot: path.join(name, file), profile: name, url, finalUrl: page.url() });
        console.log(`  [${name}] ${file} <- ${url}`);
      }
      await context.close();
    }
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`\nDone. ${manifest.length} screenshots -> ${OUT}`);
  } finally {
    await browser.close();
    if (relay) { try { relay.kill(); } catch (_) {} }
  }
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
