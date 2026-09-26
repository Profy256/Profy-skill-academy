#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
#  Dera Skul — demo content seed runner  (todo.md M0 "Seed script")
# ═══════════════════════════════════════════════════════════════════════════
#  Applies scripts/seed_content.sql. Idempotent — safe to run repeatedly, and
#  it never deletes or rewrites content an admin created through the UI.
#
#  Connection, first match wins:
#    1. DATABASE_URL   (postgres://user:pass@host:port/db  or  jdbc:postgresql://…)
#    2. PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE
#    3. compose defaults: localhost:5434 / profy / profy / profy
#
#  Examples:
#    ./scripts/seed.sh
#    DATABASE_URL=postgres://…@localhost:5432/profy ./scripts/seed.sh
#    docker compose exec -T postgres psql -U profy -d profy -f - < scripts/seed_content.sql
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

SQL_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/seed_content.sql"

if ! command -v psql >/dev/null 2>&1; then
  echo "error: psql not found — install the postgres client, or run the SQL file through" >&2
  echo "       docker compose exec -T postgres psql -U profy -d profy -f - < scripts/seed_content.sql" >&2
  exit 1
fi

if [ ! -f "$SQL_FILE" ]; then
  echo "error: seed file not found at $SQL_FILE" >&2
  exit 1
fi

# Normalise JDBC URLs (Spring Boot style) for psql.
if [ -n "${DATABASE_URL:-}" ]; then
  # psql understands postgres://… URLs natively; only the JDBC prefix needs stripping.
  DB_URL="${DATABASE_URL#jdbc:}"
  ARGS=(-d "$DB_URL")
else
  ARGS=(
    -h "${PGHOST:-localhost}"
    -p "${PGPORT:-5434}"
    -U "${PGUSER:-profy}"
    -d "${PGDATABASE:-profy}"
  )
  export PGPASSWORD="${PGPASSWORD:-profy}"
fi

echo "Applying ${SQL_FILE}…"
psql "${ARGS[@]}" -v ON_ERROR_STOP=1 --quiet -f "$SQL_FILE"
echo "Seed complete."
