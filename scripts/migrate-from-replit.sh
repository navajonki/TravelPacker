#!/usr/bin/env bash
#
# Migrate TravelPacker data (users + all app data) from a source Postgres
# (Replit) into a target Postgres (Railway).
#
# The TARGET schema must already exist — deploy the app to Railway first so its
# startup migrations create the tables, then run this. We restore DATA ONLY to
# avoid schema conflicts.
#
# Usage:
#   SOURCE_DATABASE_URL="postgresql://...replit..." \
#   TARGET_DATABASE_URL="postgresql://...railway public proxy url..." \
#   ./scripts/migrate-from-replit.sh
#
# Notes:
#   - bcrypt password hashes are plain column data, so users keep their passwords.
#   - The `session` table is intentionally excluded (sessions are disposable;
#     users simply log in again once).
#   - Use Railway's PUBLIC proxy URL for TARGET (this script runs outside Railway).
set -euo pipefail

: "${SOURCE_DATABASE_URL:?Set SOURCE_DATABASE_URL (Replit Postgres connection string)}"
: "${TARGET_DATABASE_URL:?Set TARGET_DATABASE_URL (Railway Postgres connection string)}"

# Tables to migrate, in FK-dependency order (parents first). `session` excluded.
TABLES=(
  users
  packing_lists
  packing_list_collaborators
  collaboration_invitations
  password_reset_tokens
  bags
  travelers
  categories
  items
  templates
)

WORKDIR="$(mktemp -d)"
DUMP="$WORKDIR/data.sql"
echo ">> Working dir: $WORKDIR"

# Build the -t flags
T_FLAGS=()
for t in "${TABLES[@]}"; do T_FLAGS+=(-t "public.$t"); done

echo ">> Dumping data from source (data-only, --disable-triggers for FK safety)..."
pg_dump "$SOURCE_DATABASE_URL" \
  --data-only \
  --no-owner \
  --no-privileges \
  --disable-triggers \
  "${T_FLAGS[@]}" \
  > "$DUMP"
echo ">> Dump size: $(wc -c < "$DUMP") bytes"

echo ">> Source row counts:"
for t in "${TABLES[@]}"; do
  c=$(psql "$SOURCE_DATABASE_URL" -tAc "SELECT count(*) FROM public.$t;" 2>/dev/null || echo "n/a")
  printf "   %-30s %s\n" "$t" "$c"
done

echo ">> Restoring into target..."
# session_replication_role=replica (set by --disable-triggers) needs superuser;
# Railway's default postgres role qualifies.
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$DUMP"

echo ">> Fixing serial sequences on target..."
for t in "${TABLES[@]}"; do
  psql "$TARGET_DATABASE_URL" -tAc "
    SELECT CASE WHEN pg_get_serial_sequence('public.$t','id') IS NOT NULL
      THEN setval(pg_get_serial_sequence('public.$t','id'),
                  (SELECT COALESCE(MAX(id),1) FROM public.$t),
                  (SELECT COUNT(*) > 0 FROM public.$t))::text
      ELSE 'no id sequence' END;" >/dev/null 2>&1 || true
done

echo ">> Verifying row counts (source vs target):"
mismatch=0
for t in "${TABLES[@]}"; do
  s=$(psql "$SOURCE_DATABASE_URL" -tAc "SELECT count(*) FROM public.$t;" 2>/dev/null || echo "ERR")
  d=$(psql "$TARGET_DATABASE_URL" -tAc "SELECT count(*) FROM public.$t;" 2>/dev/null || echo "ERR")
  flag=""
  if [ "$s" != "$d" ]; then flag="  <<< MISMATCH"; mismatch=1; fi
  printf "   %-30s source=%-8s target=%-8s%s\n" "$t" "$s" "$d" "$flag"
done

rm -rf "$WORKDIR"
if [ "$mismatch" -ne 0 ]; then
  echo ">> WARNING: row count mismatch detected. Review above." >&2
  exit 1
fi
echo ">> Migration complete. All row counts match."
