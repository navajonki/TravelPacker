#!/usr/bin/env node
/**
 * End-to-end API + real-time integration test for TravelPacker.
 *
 * Exercises the full acceptance flow against a running server:
 *   - register + login two users (A, B) and a no-access user (C)
 *   - create a packing list
 *   - add + edit a traveler, category, and bag
 *   - add an item
 *   - create a collaboration invitation and accept it as user B
 *   - verify real-time WebSocket sync: A's changes reach B and vice-versa
 *   - verify access control: user C is rejected (REST 403 + WS access denied)
 *
 * Usage:  BASE_URL=http://localhost:5051 node scripts/integration-test.mjs
 *         BASE_URL=https://<app>.up.railway.app node scripts/integration-test.mjs
 */
import WebSocket from "ws";

const BASE_URL = process.env.BASE_URL || "http://localhost:5051";
const WS_URL = BASE_URL.replace(/^http/, "ws") + "/ws";

let passed = 0;
let failed = 0;
const ok = (m) => { passed++; console.log(`  ✓ ${m}`); };
const fail = (m) => { failed++; console.error(`  ✗ ${m}`); };
function assert(cond, m) { cond ? ok(m) : fail(m); }

const rnd = () => Math.random().toString(36).slice(2, 10);

// --- tiny cookie-aware HTTP client -----------------------------------------
function makeClient() {
  let cookie = "";
  return async function req(method, path, body) {
    // X-Forwarded-Proto: https makes express-session (trust proxy) treat the
    // request as secure, so Secure session cookies are issued/accepted. This
    // mirrors running behind Railway's HTTPS proxy and is required when testing
    // a production build (NODE_ENV=production) over a local HTTP port.
    const headers = { "Content-Type": "application/json", "X-Forwarded-Proto": "https" };
    if (cookie) headers["Cookie"] = cookie;
    const res = await fetch(BASE_URL + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    let data = null;
    const text = await res.text();
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { status: res.status, data };
  };
}

async function registerAndLogin(label) {
  const c = makeClient();
  const username = `t_${label}_${rnd()}`;
  const password = "Passw0rd!" + rnd();
  const reg = await c("POST", "/api/auth/register", { username, password });
  if (reg.status !== 200 && reg.status !== 201) {
    throw new Error(`register ${label} failed: ${reg.status} ${JSON.stringify(reg.data)}`);
  }
  const login = await c("POST", "/api/auth/login", { username, password });
  if (login.status !== 200) {
    throw new Error(`login ${label} failed: ${login.status} ${JSON.stringify(login.data)}`);
  }
  const me = await c("GET", "/api/auth/current-user");
  const userId = me.data?.id ?? login.data?.id;
  return { client: c, username, password, userId };
}

/**
 * Join a room over WebSocket and wait for a specific broadcast message type.
 * Returns { joined: Promise (resolves once the room is joined), message: Promise
 * (resolves with the awaited message of type `wantType`) }.
 */
function wsListen(userId, packingListId, wantType, timeoutMs = 8000) {
  const ws = new WebSocket(WS_URL);
  let resolveJoined, resolveMsg, rejectMsg;
  const joined = new Promise((r) => { resolveJoined = r; });
  const message = new Promise((res, rej) => { resolveMsg = res; rejectMsg = rej; });
  const timer = setTimeout(() => { ws.close(); rejectMsg(new Error(`timeout waiting for '${wantType}'`)); }, timeoutMs);
  ws.on("open", () => ws.send(JSON.stringify({ type: "join", packingListId, userId })));
  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.type === "joined") { resolveJoined(true); return; }
    if (msg.type === "error") { clearTimeout(timer); ws.close(); rejectMsg(new Error(`WS error: ${msg.message}`)); return; }
    if (msg.type === wantType) { clearTimeout(timer); ws.close(); resolveMsg(msg); }
  });
  ws.on("error", (e) => { clearTimeout(timer); rejectMsg(e); });
  return { joined, message };
}

async function main() {
  console.log(`\n=== TravelPacker integration test against ${BASE_URL} ===\n`);

  // Health
  const health = await fetch(BASE_URL + "/api/health");
  assert(health.status === 200, "GET /api/health returns 200");

  // Users
  const A = await registerAndLogin("A");
  const B = await registerAndLogin("B");
  const C = await registerAndLogin("C");
  assert(!!A.userId && !!B.userId && !!C.userId, "registered + logged in users A, B, C");

  // Create list
  const list = await A.client("POST", "/api/packing-lists", { name: `Trip ${rnd()}`, userId: A.userId });
  assert(list.status === 201 || list.status === 200, "user A creates a packing list");
  const listId = list.data.id;

  // Traveler: create + edit
  const trav = await A.client("POST", "/api/travelers", { name: "Alice", packingListId: listId });
  assert((trav.status === 201 || trav.status === 200) && trav.data.id, "create traveler");
  const travEdit = await A.client("PATCH", `/api/travelers/${trav.data.id}`, { name: "Alice Smith" });
  assert(travEdit.status === 200 && travEdit.data.name === "Alice Smith", "edit traveler");

  // Category: create + edit
  const cat = await A.client("POST", "/api/categories", { name: "Clothes", position: 0, packingListId: listId });
  assert((cat.status === 201 || cat.status === 200) && cat.data.id, "create category");
  const catEdit = await A.client("PATCH", `/api/categories/${cat.data.id}`, { name: "Apparel" });
  assert(catEdit.status === 200 && catEdit.data.name === "Apparel", "edit category");

  // Bag: create + edit
  const bag = await A.client("POST", "/api/bags", { name: "Carry-on", packingListId: listId });
  assert((bag.status === 201 || bag.status === 200) && bag.data.id, "create bag");
  const bagEdit = await A.client("PATCH", `/api/bags/${bag.data.id}`, { name: "Backpack" });
  assert(bagEdit.status === 200 && bagEdit.data.name === "Backpack", "edit bag");

  // Item
  const item = await A.client("POST", "/api/items", {
    name: "Socks", quantity: 3, packingListId: listId, categoryId: cat.data.id, travelerId: trav.data.id,
  });
  assert((item.status === 201 || item.status === 200) && item.data.id, "create item");

  // Access control BEFORE invite: C cannot see the list
  const cView = await C.client("GET", `/api/packing-lists/${listId}`);
  assert(cView.status === 403 || cView.status === 404, "user C (no access) is denied the list");

  // Invitation: A invites B's email; B accepts by token
  const invite = await A.client("POST", "/api/invitations", { packingListId: listId, email: `${B.username}@example.com` });
  assert((invite.status === 201 || invite.status === 200) && invite.data.token, "user A creates an invitation (token issued)");
  const token = invite.data.token;
  const lookup = await B.client("GET", `/api/invitations/${token}`);
  assert(lookup.status === 200 && lookup.data.packingList?.id === listId, "invitation link resolves to the list");
  const accept = await B.client("POST", `/api/invitations/${token}/accept`);
  assert(accept.status === 200 || accept.status === 201, "user B accepts the invitation");
  const bView = await B.client("GET", `/api/packing-lists/${listId}`);
  assert(bView.status === 200, "user B can now access the shared list");

  // Real-time: B joins the room, A creates an item -> B receives item_updated
  {
    const { joined, message } = wsListen(B.userId, listId, "item_updated", 8000);
    await joined; // ensure B is in the room before A makes the change
    const newItem = await A.client("POST", "/api/items", { name: "Toothbrush", quantity: 1, packingListId: listId, categoryId: cat.data.id });
    assert(newItem.status === 201 || newItem.status === 200, "user A adds an item (to trigger broadcast)");
    try {
      const msg = await message;
      assert(msg.item?.name === "Toothbrush", "user B receives real-time item_updated for A's change");
    } catch (e) {
      fail(`real-time A→B: ${e.message}`);
    }
  }

  // Real-time reverse: A joins, B (collaborator) creates an item -> A receives it
  {
    const { joined, message } = wsListen(A.userId, listId, "item_updated", 8000);
    await joined;
    const newItem = await B.client("POST", "/api/items", { name: "Charger", quantity: 1, packingListId: listId, categoryId: cat.data.id });
    assert(newItem.status === 201 || newItem.status === 200, "collaborator B adds an item");
    try {
      const msg = await message;
      assert(msg.item?.name === "Charger", "user A receives real-time item_updated for B's change");
    } catch (e) {
      fail(`real-time B→A: ${e.message}`);
    }
  }

  // WS access control: C cannot join the room
  await new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    const timer = setTimeout(() => { ws.close(); fail("WS access denied for C (timed out, no response)"); resolve(); }, 6000);
    ws.on("open", () => ws.send(JSON.stringify({ type: "join", packingListId: listId, userId: C.userId })));
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "joined") { clearTimeout(timer); fail("user C should NOT be able to join the room"); ws.close(); resolve(); }
      if (msg.type === "error") { clearTimeout(timer); ok("WS join rejected for user C (no access)"); ws.close(); resolve(); }
    });
    ws.on("error", () => { clearTimeout(timer); resolve(); });
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
