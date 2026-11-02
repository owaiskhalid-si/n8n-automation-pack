#!/usr/bin/env bash
# Nightly backup: Postgres dump + workflow export.
# Always kept locally with rotation (BACKUP_DIR, BACKUP_KEEP); also copied to S3 when
# BACKUP_BUCKET is set and the AWS CLI is installed. Installed as a cron job by the
# Oracle setup script and the Terraform bootstrap:  15 3 * * *
set -euo pipefail
cd "$(dirname "$0")/.."
set -a
# shellcheck source=/dev/null
source .env
set +a

dir=${BACKUP_DIR:-/var/backups/n8n}
keep=${BACKUP_KEEP:-14}
stamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$dir/postgres" "$dir/workflows"

docker compose exec -T postgres pg_dump -U n8n -d n8n --format=custom >"$dir/postgres/n8n-$stamp.dump"
docker compose exec -T n8n sh -c \
  'rm -rf /tmp/export && mkdir -p /tmp/export && n8n export:workflow --backup --output=/tmp/export/ >/dev/null && tar -C /tmp/export -czf - .' \
  >"$dir/workflows/workflows-$stamp.tgz"

# Keep the newest $keep of each; delete the rest.
for sub in postgres workflows; do
  find "$dir/$sub" -maxdepth 1 -type f -printf '%T@ %p\n' | sort -rn | tail -n +"$((keep + 1))" | cut -d' ' -f2- | xargs -r rm -f
done

if [ -n "${BACKUP_BUCKET:-}" ] && command -v aws >/dev/null 2>&1; then
  aws s3 cp "$dir/postgres/n8n-$stamp.dump" "s3://$BACKUP_BUCKET/postgres/" --only-show-errors
  aws s3 cp "$dir/workflows/workflows-$stamp.tgz" "s3://$BACKUP_BUCKET/workflows/" --only-show-errors
  echo "[$(date -u +%FT%TZ)] backup $stamp → $dir + s3://$BACKUP_BUCKET"
else
  echo "[$(date -u +%FT%TZ)] backup $stamp → $dir (keeping $keep)"
fi
