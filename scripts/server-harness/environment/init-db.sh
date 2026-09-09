#!/bin/sh
set -eu

# This script runs only inside the dedicated Compose PostgreSQL container.
[ "${POSTGRES_DB:-}" = gi_server_harness ] || { echo 'Unexpected fixture database' >&2; exit 1; }
[ "${POSTGRES_USER:-}" = harness ] || { echo 'Unexpected fixture database user' >&2; exit 1; }
[ -n "${HARNESS_GH_TOKEN_A:-}" ] && [ -n "${HARNESS_GH_TOKEN_B:-}" ]
test -d /harness/migrations
script_file=$(mktemp /tmp/gi-harness-migrations.XXXXXX)
trap 'rm -f "$script_file"' EXIT HUP INT TERM

cat > "$script_file" <<'SQL'
\set ON_ERROR_STOP on
BEGIN;
SELECT pg_advisory_xact_lock(91000001);
CREATE TABLE IF NOT EXISTS "_HarnessMigration" (
  "name" TEXT PRIMARY KEY,
  "sha256" TEXT NOT NULL,
  "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
SQL

# Lexical timestamp order is also the Prisma migration order. Preserve the
# original SQL files and record their exact hashes; never silently reapply them.
for migration in /harness/migrations/*/migration.sql; do
  test -f "$migration"
  migration_dir=${migration%/migration.sql}
  migration_name=${migration_dir##*/}
  case "$migration_name" in *[!a-zA-Z0-9_-]*|'') echo 'Unsafe migration directory name' >&2; exit 1;; esac
  checksum=$(sha256sum "$migration")
  checksum=${checksum%% *}
  cat >> "$script_file" <<SQL
SELECT EXISTS(SELECT 1 FROM "_HarnessMigration" WHERE "name" = '$migration_name') AS harness_applied \gset
\if :harness_applied
SELECT "sha256" = '$checksum' AS harness_checksum_matches FROM "_HarnessMigration" WHERE "name" = '$migration_name' \gset
\if :harness_checksum_matches
\else
DO \$\$ BEGIN RAISE EXCEPTION 'Previously applied harness migration checksum changed: $migration_name'; END \$\$;
\endif
\else
\i $migration
INSERT INTO "_HarnessMigration" ("name", "sha256") VALUES ('$migration_name', '$checksum');
\endif
SQL
done

cat >> "$script_file" <<'SQL'
\getenv harness_token_a HARNESS_GH_TOKEN_A
\getenv harness_token_b HARNESS_GH_TOKEN_B
INSERT INTO "User" ("id", "name", "ghToken") VALUES
  (91000001, 'Harness User A', :'harness_token_a'),
  (91000002, 'Harness User B', :'harness_token_b')
ON CONFLICT ("id") DO NOTHING;
COMMIT;
SQL

psql --no-psqlrc --quiet --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --file "$script_file"
