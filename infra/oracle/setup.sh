#!/usr/bin/env bash
# One-shot server setup for n8n + Postgres + Caddy on an Oracle Cloud "Always Free"
# Ampere A1 VM (Ubuntu 22.04/24.04). Works on any Ubuntu VPS.
#
#   sudo bash infra/oracle/setup.sh --domain n8n.example.com --email you@example.com
#
# Options:
#   --domain <host>       public hostname pointing at this VM. Default: <public-ip>.sslip.io
#   --email <address>     Let's Encrypt registration email (required)
#   --repo <git url>      clone this URL when the script is not run from a checkout
#   --branch <name>       branch to clone (default: main)
#   --editor-ips "<cidrs>" space-separated CIDRs allowed to open the editor (default: everyone)
#   --timezone <tz>       default: America/Toronto
#   --backup-keep <n>     nightly backups to keep (default: 14)
#   --no-swap             skip the 2 GB swap file
#
# Safe to re-run: existing secrets in infra/.env are kept, containers are updated in place.
set -euo pipefail

domain=""
email=""
repo=""
branch="main"
editor_ips="0.0.0.0/0 ::/0"
timezone="America/Toronto"
backup_keep="14"
swap=1

while [ $# -gt 0 ]; do
  case "$1" in
    --domain) domain="$2"; shift 2 ;;
    --email) email="$2"; shift 2 ;;
    --repo) repo="$2"; shift 2 ;;
    --branch) branch="$2"; shift 2 ;;
    --editor-ips) editor_ips="$2"; shift 2 ;;
    --timezone) timezone="$2"; shift 2 ;;
    --backup-keep) backup_keep="$2"; shift 2 ;;
    --no-swap) swap=0; shift ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash $0 ..." >&2
  exit 1
fi
if [ -z "$email" ]; then
  echo "--email is required (Let's Encrypt needs a contact address)" >&2
  exit 2
fi

log() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }

# ── 1 · Packages ──────────────────────────────────────────────────────────────
log "Installing Docker, Compose, git and unattended upgrades"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq docker.io docker-compose-v2 git cron curl ca-certificates unattended-upgrades
systemctl enable --now docker
dpkg-reconfigure -f noninteractive unattended-upgrades >/dev/null 2>&1 || true

# ── 2 · Firewall: Oracle's Ubuntu images ship iptables rules that block everything
#        except SSH, on top of the VCN security list. Open 80/443 and persist it.
log "Opening ports 80 and 443 in iptables"
for rule in "-p tcp --dport 80" "-p tcp --dport 443" "-p udp --dport 443"; do
  # shellcheck disable=SC2086
  if ! iptables -C INPUT $rule -j ACCEPT 2>/dev/null; then
    # shellcheck disable=SC2086
    iptables -I INPUT 5 $rule -j ACCEPT 2>/dev/null || iptables -I INPUT $rule -j ACCEPT
  fi
done
if command -v netfilter-persistent >/dev/null 2>&1; then
  netfilter-persistent save >/dev/null
elif [ -d /etc/iptables ]; then
  iptables-save > /etc/iptables/rules.v4
fi

# ── 3 · Swap (helps the 1 OCPU / 6 GB shapes; harmless on 24 GB) ─────────────
if [ "$swap" -eq 1 ] && [ ! -f /swapfile ]; then
  log "Adding a 2 GB swap file"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ── 4 · Code: use the checkout this script lives in, or clone ────────────────
script_dir=$(cd "$(dirname "$0")" && pwd)
if [ -f "$script_dir/../docker-compose.yml" ]; then
  app=$(cd "$script_dir/../.." && pwd)
else
  app=/opt/n8n-automation-pack
  if [ -z "$repo" ]; then
    echo "--repo <git url> is required when not running from a checkout" >&2
    exit 2
  fi
  if [ -d "$app/.git" ]; then
    log "Updating $app"
    git -C "$app" pull --ff-only
  else
    log "Cloning $repo → $app"
    git clone --depth 1 --branch "$branch" "$repo" "$app"
  fi
fi
cd "$app/infra"

# ── 5 · Domain + secrets ─────────────────────────────────────────────────────
if [ -z "$domain" ]; then
  ip=$(curl -4fsS https://api.ipify.org || curl -fsS http://169.254.169.254/opc/v1/vnics/ | grep -o '"publicIp" *: *"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
  [ -n "$ip" ] || { echo "Could not determine the public IP — pass --domain" >&2; exit 1; }
  domain="${ip}.sslip.io"
  log "No --domain given; using $domain (sslip.io resolves it to this VM, Let's Encrypt is fine with it)"
fi

if [ -f .env ]; then
  log "Keeping existing secrets in infra/.env"
  # shellcheck source=/dev/null
  source .env
  enc_key="${N8N_ENCRYPTION_KEY:-$(openssl rand -hex 32)}"
  pg_pass="${POSTGRES_PASSWORD:-$(openssl rand -hex 32)}"
else
  log "Generating N8N_ENCRYPTION_KEY and POSTGRES_PASSWORD"
  enc_key=$(openssl rand -hex 32)
  pg_pass=$(openssl rand -hex 32)
fi
umask 077
cat > .env <<ENV
N8N_DOMAIN=$domain
ACME_EMAIL=$email
N8N_ENCRYPTION_KEY=$enc_key
POSTGRES_PASSWORD=$pg_pass
TIMEZONE=$timezone
N8N_VERSION=${N8N_VERSION:-2.40.7}
EDITOR_ALLOWED_IPS=$editor_ips
BACKUP_DIR=/var/backups/n8n
BACKUP_KEEP=$backup_keep
BACKUP_BUCKET=${BACKUP_BUCKET:-}
ENV
umask 022

# ── 6 · Start the stack ──────────────────────────────────────────────────────
log "Starting n8n, Postgres and Caddy"
docker compose pull -q
docker compose up -d
chmod +x "$app"/infra/scripts/*.sh

# ── 7 · Nightly backups (local rotation; S3 if BACKUP_BUCKET is set) ─────────
mkdir -p /var/backups/n8n
echo "15 3 * * * root $app/infra/scripts/backup.sh >> /var/log/n8n-backup.log 2>&1" > /etc/cron.d/n8n-backup
chmod 644 /etc/cron.d/n8n-backup

# ── 8 · Wait for n8n ─────────────────────────────────────────────────────────
log "Waiting for n8n to become healthy"
for _ in $(seq 1 60); do
  if docker compose exec -T n8n wget -qO- http://localhost:5678/healthz >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

cat <<DONE

✓ n8n is starting at https://$domain
  Caddy fetches the certificate on the first request — give it ~30 seconds.
  Make sure the VCN security list allows TCP 80 and 443 from 0.0.0.0/0 (see infra/oracle/README.md).

Next:
  1. Open https://$domain and create the owner account.
  2. Credentials → add "Google Gemini (PaLM) API" (key from aistudio.google.com) and a
     Header Auth credential named "Demo gateway key" (name X-Demo-Key, a long random value).
  3. Copy infra/credentials.example.json → infra/credentials.json, fill in the credential IDs, then:
       PROTECT=1 $app/infra/scripts/deploy-workflows.sh
  4. On Vercel set N8N_WEBHOOK_BASE=https://$domain and N8N_DEMO_KEY=<that value>.

Logs:    cd $app/infra && docker compose logs -f n8n
Backups: /var/backups/n8n (nightly 03:15, keeps $backup_keep)
DONE
