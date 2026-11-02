#!/usr/bin/env bash
# Restore the n8n Postgres database from a nightly dump.
#   infra/scripts/restore.sh n8n-20260929T031500Z.dump      # from BACKUP_DIR, else from S3
#   infra/scripts/restore.sh /path/to/n8n-….dump             # any local file
set -euo pipefail
cd "$(dirname "$0")/.."
set -a
# shellcheck source=/dev/null
source .env
set +a
file=${1:?usage: restore.sh <dump file name or path>}
dir=${BACKUP_DIR:-/var/backups/n8n}

if [ -f "$file" ]; then
  src=$file
elif [ -f "$dir/postgres/$file" ]; then
  src="$dir/postgres/$file"
elif [ -n "${BACKUP_BUCKET:-}" ]; then
  src="/tmp/$(basename "$file")"
  aws s3 cp "s3://$BACKUP_BUCKET/postgres/$(basename "$file")" "$src" --only-show-errors
else
  echo "Not found: $file (looked in $dir/postgres; BACKUP_BUCKET is not set)" >&2
  exit 1
fi

docker compose stop n8n
docker compose exec -T postgres pg_restore -U n8n -d n8n --clean --if-exists <"$src"
docker compose start n8n
[[ $src == /tmp/* ]] && rm -f "$src"
echo "Restored $(basename "$src")"
