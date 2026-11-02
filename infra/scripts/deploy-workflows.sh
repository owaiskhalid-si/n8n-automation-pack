#!/usr/bin/env bash
# Build the workflows with this instance's credential IDs, import them and publish
# every webhook workflow. Safe to re-run: imports update workflows in place by ID.
#   infra/scripts/deploy-workflows.sh [infra/credentials.json]
# PROTECT=1 makes every webhook require the "Demo gateway key" header credential.
set -euo pipefail
cd "$(dirname "$0")/../.."
creds=${1:-infra/credentials.json}
compose="docker compose -f infra/docker-compose.yml --env-file infra/.env"
protect=()
[ -n "${PROTECT:-}" ] && protect=(--protect)

# Build inside a throwaway Node container — no Node.js needed on the host.
docker run --rm -v "$PWD":/app -w /app node:22-alpine \
  node tools/build.mjs --out dist/deploy --credentials "$creds" "${protect[@]}"

$compose exec -T n8n sh -c 'rm -rf /tmp/wf && mkdir -p /tmp/wf'
count=0
for f in dist/deploy/[0-9]*.json; do
  count=$((count + 1))
  name=$(basename "$f")
  $compose cp "$f" "n8n:/tmp/wf/$name"
  $compose exec -T n8n n8n import:workflow --input="/tmp/wf/$name"
  if grep -q '"n8n-nodes-base.webhook"' "$f"; then
    id=$(grep -m1 '"id":' "$f" | sed -E 's/.*"id": "([^"]+)".*/\1/')
    $compose exec -T n8n n8n publish:workflow --id="$id"
  fi
done

# Webhooks are registered on start-up.
$compose restart n8n
echo "Deployed $count workflows."
