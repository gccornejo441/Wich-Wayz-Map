#!/usr/bin/env bash
set -euo pipefail

# Use sqlite3.exe on Windows (assumes it's in PATH)
SQLITE3="sqlite3.exe"

DB_PATH="${1:-./data/wich-wayz-map.db}"
BACKUP_DIR="${2:-./data/backups}"

mkdir -p "$BACKUP_DIR"

TS="$(date +%Y-%m-%d_%H%M%S)"
DB_OUT="$BACKUP_DIR/wich-wayz-map_${TS}.db"
SQL_OUT="$BACKUP_DIR/wich-wayz-map_${TS}.sql"
SCHEMA_OUT="$BACKUP_DIR/wich-wayz-map_${TS}.schema.sql"

# 1) Checkpoint WAL -> main DB
$SQLITE3 "$DB_PATH" "PRAGMA wal_checkpoint(FULL);"

# 2) Dump + schema
$SQLITE3 "$DB_PATH" ".dump" > "$SQL_OUT"
$SQLITE3 "$DB_PATH" ".schema" > "$SCHEMA_OUT"

# 3) Copy DB snapshot
cp -f "$DB_PATH" "$DB_OUT"

# 4) Verify rebuild + integrity
REBUILD_DB="./data/wich-wayz-map_rebuild_temp.db"
rm -f "$REBUILD_DB"
$SQLITE3 "$REBUILD_DB" < "$SQL_OUT"

CHECK="$($SQLITE3 "$REBUILD_DB" "PRAGMA integrity_check;")"
# Trim any whitespace/carriage returns
CHECK=$(echo "$CHECK" | tr -d '\r\n' | xargs)
if [[ "$CHECK" != "ok" ]]; then
  echo "Integrity check failed: $CHECK" >&2
  rm -f "$REBUILD_DB"
  exit 1
fi

rm -f "$REBUILD_DB"

echo "Backup OK:"
echo " - $DB_OUT"
echo " - $SQL_OUT"
echo " - $SCHEMA_OUT"
