// Headless Playwright audit of TravelPacker (Railway deployment), desktop + mobile.
// Visits every route, captures screenshots, and exercises interactive states.
// Chromium is routed through the local MITM relay (relay.js) so it can reach the
// site through the Claude Code egress proxy (which otherwise resets Chromium TLS).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.AUDIT_BASE || 'https://travelpacker-production.up.railway.app';
const USER = process.env.AUDIT_USER || 'zjbodnar@gmail.com';
const PASS = process.env.AUDIT_PASS || 'pass12345';
const RELAY = process.env.RELAY_URL || 'http://127.0.0.1:8899';
const OUT = path.join(__dirname, 'screenshots');

const PROFILES = [
  {
    name: 'desktop',
    contextOptions: { viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true },
  },
  {
    name: 'mobile',
    contextOptions: {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
        '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      ignoreHTTPSErrors: true,
    },
  },
];

const manifest = [];

async function safeClick(page, locator, timeout = 4000) {
  try { await locator.first().click({ timeout }); return true; }
  catch (e) { return false; }
}

function makeShot(page, profile, dir, state) {
  return async function shot(id, meta) {
    state.counter++;
    const file = `${String(state.counter).padStart(2, '0')}-${id}.png`;
    const rel = path.join(profile.name, file);
    await page.waitForTimeout(600);
    try { await page.screenshot({ path: path.join(dir, file), fullPage: meta.fullPage !== false }); }
    catch (e) { await page.screenshot({ path: path.join(dir, file) }); }
    manifest.push({
      screenshot: rel,
      profile: profile.name,
      viewport: `${profile.contextOptions.viewport.width}x${profile.contextOptions.viewport.height}`,
      route: meta.route, page: meta.page, state: meta.state,
      description: meta.description, url: page.url(),
    });
    console.log(`  [${profile.name}] ${file} — ${meta.page} / ${meta.state}`);
  };
}

async function runProfile(browser, profile) {
  console.log(`\n===== profile: ${profile.name} =====`);
  const dir = path.join(OUT, profile.name);
  fs.mkdirSync(dir, { recursive: true });
  const context = await browser.newContext(profile.contextOptions);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const state = { counter: 0 };
  const shot = makeShot(page, profile, dir, state);

  // ---------- PUBLIC ROUTES ----------
  await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle' });
  await shot('auth-login', {
    route: '/auth', page: 'AuthPage', state: 'Login tab (default)',
    description: 'Authentication page: Login form (email + password) with marketing hero.',
  });
  await safeClick(page, page.getByRole('tab', { name: 'Register' }));
  await shot('auth-register', {
    route: '/auth', page: 'AuthPage', state: 'Register tab',
    description: 'Registration form with email, password, confirm-password.',
  });

  await page.goto(`${BASE}/forgot-password`, { waitUntil: 'networkidle' });
  await shot('forgot-password', {
    route: '/forgot-password', page: 'ForgotPasswordPage', state: 'Default',
    description: 'Forgot-password request form to send a reset email.',
  });

  await page.goto(`${BASE}/reset-password`, { waitUntil: 'networkidle' });
  await shot('reset-password', {
    route: '/reset-password', page: 'ResetPasswordPage', state: 'Default (no token)',
    description: 'Password reset page rendered without a valid token query param.',
  });

  await page.goto(`${BASE}/invitation/sample-invite-token`, { waitUntil: 'networkidle' });
  await shot('invitation', {
    route: '/invitation/:token', page: 'InvitationPage', state: 'Sample token',
    description: 'Collaboration invitation acceptance page for a sample/invalid token.',
  });

  await page.goto(`${BASE}/this-route-does-not-exist`, { waitUntil: 'networkidle' });
  await shot('not-found', {
    route: '* (fallback)', page: 'NotFound', state: 'Default',
    description: '404 Not Found page shown for unmatched routes.',
  });

  // ---------- LOGIN ----------
  await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle' });
  await page.fill('#login-email', USER);
  await page.fill('#login-password', PASS);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}),
    safeClick(page, page.getByRole('button', { name: /sign in/i })),
  ]);
  await page.waitForTimeout(2000);
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  console.log(`  [${profile.name}] logged in: ${!page.url().includes('/auth')}`);

  // ---------- DASHBOARD ----------
  await shot('dashboard', {
    route: '/', page: 'Dashboard', state: 'Default (list of packing lists)',
    description: 'Dashboard listing packing lists as cards with progress bars + Copy/Delete.',
  });
  if (await safeClick(page, page.getByRole('button', { name: /new list|create new list/i }))) {
    await shot('dashboard-create-modal', {
      route: '/', page: 'Dashboard', state: 'Create List modal open', fullPage: false,
      description: 'CreateListModal dialog for naming a new packing list.',
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  // Discover a real list id.
  let listId = null;
  try {
    const resp = await page.evaluate(async () => {
      const r = await fetch('/api/packing-lists', { credentials: 'include' });
      return r.ok ? r.json() : null;
    });
    if (Array.isArray(resp) && resp.length) listId = resp[0].id;
  } catch (e) {}

  const deleteBtn = page.getByRole('button', { name: /delete/i });
  if (await deleteBtn.count() > 0 && await safeClick(page, deleteBtn)) {
    await shot('dashboard-delete-dialog', {
      route: '/', page: 'Dashboard', state: 'Delete confirmation AlertDialog', fullPage: false,
      description: 'AlertDialog confirming deletion of a packing list.',
    });
    await safeClick(page, page.getByRole('button', { name: /cancel/i }));
    await page.waitForTimeout(400);
  }

  if (listId == null) {
    console.log(`  [${profile.name}] no list id — skipping list routes`);
    await context.close();
    return;
  }

  // ---------- PACKING LIST ----------
  await page.goto(`${BASE}/list/${listId}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot('list-category', {
    route: '/list/:id', page: 'PackingList', state: 'By Category view (default)',
    description: 'Packing list detail, By Category tab: category cards, item rows, Add cards.',
  });
  if (await safeClick(page, page.getByRole('tab', { name: /by bag/i }))) {
    await shot('list-bag', { route: '/list/:id', page: 'PackingList', state: 'By Bag view',
      description: 'Packing list grouped by physical bags.' });
  }
  if (await safeClick(page, page.getByRole('tab', { name: /by traveler/i }))) {
    await shot('list-traveler', { route: '/list/:id', page: 'PackingList', state: 'By Traveler view',
      description: 'Packing list grouped by traveler.' });
  }
  if (await safeClick(page, page.getByRole('tab', { name: /^filters$/i }))) {
    await page.waitForTimeout(500);
    await shot('list-filters', { route: '/list/:id', page: 'PackingList', state: 'Filters view',
      description: 'Filters: category/bag/traveler multi-selects, group-by, packed/unpacked switches.' });
    if (await safeClick(page, page.locator('#group-by'))) {
      await shot('list-filters-groupby', { route: '/list/:id', page: 'PackingList',
        state: 'Filters — Group By select open', fullPage: false,
        description: 'Group By dropdown (None / Category / Bag / Traveler).' });
      await page.keyboard.press('Escape');
    }
    await safeClick(page, page.getByRole('tab', { name: /by category/i }));
    await page.waitForTimeout(400);
  }

  // Quick Add inline form → Advanced Add modal.
  if (await safeClick(page, page.getByRole('button', { name: /^add item$/i }))) {
    await page.waitForTimeout(500);
    await shot('list-quick-add', { route: '/list/:id', page: 'PackingList',
      state: 'Quick Add item form open', fullPage: false,
      description: 'Inline Quick Add form with a link out to the Advanced Add modal.' });
    if (await safeClick(page, page.getByRole('button', { name: /advanced|more options/i }))) {
      await page.waitForTimeout(500);
      if (await page.getByRole('dialog').count() > 0) {
        await shot('list-advanced-add-modal', { route: '/list/:id', page: 'PackingList',
          state: 'Advanced Add Item modal open', fullPage: false,
          description: 'AdvancedAddItemModal: item with category/bag/traveler/quantity fields.' });
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
    await safeClick(page, page.getByRole('button', { name: /^add item$/i }));
    await page.waitForTimeout(300);
  }

  // Add Category modal.
  if (await safeClick(page, page.getByText(/add new category/i))) {
    await page.waitForTimeout(500);
    if (await page.getByRole('dialog').count() > 0) {
      await shot('list-add-category-modal', { route: '/list/:id', page: 'PackingList',
        state: 'Add Category modal open', fullPage: false,
        description: 'AddCategoryModal dialog for creating a new category.' });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  }

  // Share modal (desktop top-right button; on mobile lives in the ⋯ menu).
  if (await safeClick(page, page.getByRole('button', { name: /^share$/i }))) {
    await page.waitForTimeout(600);
    if (await page.getByRole('dialog').count() > 0) {
      await shot('list-share-modal', { route: '/list/:id', page: 'PackingList',
        state: 'Share / invite collaborators modal open', fullPage: false,
        description: 'ShareModal: invite collaborators by email, manage sharing.' });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  }

  // Header ⋯ menu + Edit List modal.
  const moreBtn = page.locator('header button.h-8.w-8');
  if (await safeClick(page, moreBtn.first())) {
    await page.waitForTimeout(400);
    if (await page.getByRole('menuitem').count() > 0) {
      await shot('list-header-menu', { route: '/list/:id', page: 'PackingList',
        state: 'Header actions dropdown open', fullPage: false,
        description: 'Header ⋯ menu: Share, Export, Edit List, Delete List.' });
      if (await safeClick(page, page.getByRole('menuitem', { name: /edit list/i }))) {
        await page.waitForTimeout(500);
        if (await page.getByRole('dialog').count() > 0) {
          await shot('list-edit-modal', { route: '/list/:id', page: 'PackingList',
            state: 'Edit List modal open', fullPage: false,
            description: 'EditListModal: rename list, update theme / date range.' });
        }
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    } else {
      await page.keyboard.press('Escape');
    }
  }

  // Bulk-edit mode.
  if (await safeClick(page, page.getByRole('button', { name: /edit multiple/i }))) {
    await page.waitForTimeout(600);
    await shot('list-multi-edit', { route: '/list/:id', page: 'PackingList',
      state: 'Multi-select / bulk edit mode',
      description: 'Bulk-edit mode: selectable rows with checkboxes and a bulk-action bar.' });
    await safeClick(page, page.getByRole('button', { name: /done|cancel|exit/i }));
    await page.waitForTimeout(300);
  }

  // ---------- UNASSIGNED ITEMS ----------
  await page.goto(`${BASE}/list/${listId}/unassigned`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await shot('list-unassigned', { route: '/list/:id/unassigned', page: 'UnassignedItemsTest',
    state: 'Default', description: 'Standalone view for unassigned items of a list.' });

  await context.close();
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    proxy: { server: RELAY },
    args: ['--ignore-certificate-errors'],
  });
  for (const profile of PROFILES) {
    await runProfile(browser, profile);
  }
  fs.writeFileSync(path.join(__dirname, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nDone. ${manifest.length} screenshots across ${PROFILES.length} profiles.`);
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
