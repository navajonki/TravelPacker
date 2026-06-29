#!/usr/bin/env node
/**
 * Copy all TravelPacker data from a SOURCE Postgres (Neon/Replit) into a TARGET
 * Postgres (Railway). Designed to run *inside Railway* (as a one-off service),
 * because the target's private network and the source both require TCP egress
 * that the dev sandbox doesn't have.
 *
 * - Copies by COLUMN INTERSECTION so it's robust to schema drift between the
 *   two databases (only columns present in both are copied).
 * - Preserves primary-key ids, then fixes serial sequences.
 * - TRUNCATEs target app tables first (RESTART IDENTITY CASCADE) so re-runs are
 *   idempotent. The `session` table is left untouched.
 * - The TARGET schema must already exist (the app's startup migrations create it).
 *
 * Env: SOURCE_DATABASE_URL, TARGET_DATABASE_URL
 */
import postgres from "postgres";

const SOURCE = process.env.SOURCE_DATABASE_URL;
const TARGET = process.env.TARGET_DATABASE_URL;
if (!SOURCE || !TARGET) {
  console.error("Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL");
  process.exit(1);
}

// SSL: Railway private network / localhost = none; everything else (Neon, public proxies) = require.
const ssl = (url) =>
  url.includes("railway.internal") || url.includes("localhost") || url.includes("127.0.0.1")
    ? false
    : "require";

// FK-dependency order (parents first). `session` intentionally excluded.
const TABLES = [
  "users",
  "packing_lists",
  "packing_list_collaborators",
  "collaboration_invitations",
  "password_reset_tokens",
  "bags",
  "travelers",
  "categories",
  "items",
  "templates",
];

const src = postgres(SOURCE, { ssl: ssl(SOURCE), max: 4 });
const dst = postgres(TARGET, { ssl: ssl(TARGET), max: 4 });

async function columnsOf(sql, table) {
  const rows = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}`;
  return new Set(rows.map((r) => r.column_name));
}

async function main() {
  console.log("== Copying data SOURCE -> TARGET ==");

  // Truncate target tables (reverse order not needed with CASCADE).
  const list = TABLES.map((t) => `"${t}"`).join(", ");
  await dst.unsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE;`);
  console.log("Truncated target tables.");

  const summary = [];
  for (const table of TABLES) {
    const [sCols, tCols] = await Promise.all([columnsOf(src, table), columnsOf(dst, table)]);
    const cols = [...sCols].filter((c) => tCols.has(c));
    if (cols.length === 0) {
      console.log(`  ${table}: no common columns, skipping`);
      continue;
    }
    const rows = await src.unsafe(`SELECT ${cols.map((c) => `"${c}"`).join(", ")} FROM "${table}"`);
    if (rows.length > 0) {
      // Insert in chunks to keep statements reasonable.
      const CHUNK = 500;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const slice = rows.slice(i, i + CHUNK);
        await dst`INSERT INTO ${dst(table)} ${dst(slice, ...cols)}`;
      }
    }
    summary.push([table, rows.length, cols.length]);
    console.log(`  ${table}: copied ${rows.length} rows (${cols.length} cols)`);
  }

  // Fix serial sequences to max(id). Resolve the sequence first so we never
  // reference `id` on tables that don't have it (e.g. composite-PK junctions).
  for (const table of TABLES) {
    const hasId = await dst`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=${table} AND column_name='id'`;
    if (hasId.length === 0) continue; // composite-PK tables have no id sequence
    const [{ seq }] = await dst.unsafe(`SELECT pg_get_serial_sequence('public.${table}','id') AS seq`);
    if (!seq) continue;
    await dst.unsafe(
      `SELECT setval('${seq}', GREATEST((SELECT COALESCE(MAX(id),1) FROM "${table}"),1), (SELECT COUNT(*)>0 FROM "${table}"))`
    );
  }
  console.log("Fixed sequences.");

  // Verify counts.
  console.log("== Verification (source vs target) ==");
  let mismatch = false;
  for (const table of TABLES) {
    const [s] = await src.unsafe(`SELECT COUNT(*)::int AS c FROM "${table}"`);
    const [d] = await dst.unsafe(`SELECT COUNT(*)::int AS c FROM "${table}"`);
    const flag = s.c !== d.c ? "  <<< MISMATCH" : "";
    if (s.c !== d.c) mismatch = true;
    console.log(`  ${table.padEnd(30)} source=${String(s.c).padEnd(8)} target=${String(d.c).padEnd(8)}${flag}`);
  }

  await src.end();
  await dst.end();
  if (mismatch) {
    console.error("DONE WITH MISMATCHES");
    process.exit(1);
  }
  console.log("DONE: all row counts match.");
  process.exit(0);
}

main().catch((e) => {
  console.error("COPY FAILED:", e);
  process.exit(1);
});
