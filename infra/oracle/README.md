# n8n on Oracle Cloud — Always Free

A free, permanent VM that runs the whole stack: **n8n 2.40 + Postgres 16 + Caddy (HTTPS)**.
Oracle's Always Free tier includes an Ampere A1 (ARM) allowance of **4 OCPU + 24 GB RAM** and 200 GB of block storage — far more than n8n needs.

`setup.sh` does the server side in one go. This page covers the console clicks around it.

## 1 · Account

- Sign up at [cloud.oracle.com](https://cloud.oracle.com) (a card is required for identity verification; Always Free resources are never billed).
- Pick a home region close to you (e.g. **Canada Southeast (Toronto)**). Always Free resources must live in the home region.
- Tip: Ampere capacity in the free tier is often "Out of capacity". Retry at another hour, try another availability domain, or upgrade the account to Pay-As-You-Go — Always Free resources stay free, but PAYG tenancies get capacity priority.

## 2 · Create the VM

Compute → Instances → **Create instance**:

| Setting | Value |
|---|---|
| Image | **Ubuntu 24.04** (Canonical), *aarch64* build |
| Shape | **VM.Standard.A1.Flex** — 4 OCPU, 24 GB (anything ≥ 1 OCPU / 6 GB works) |
| Networking | default VCN + public subnet, **Assign a public IPv4 address** |
| SSH keys | upload or generate; you log in as `ubuntu` |
| Boot volume | 50 GB is plenty (free up to 200 GB total) |

## 3 · Open ports 80 and 443

Oracle blocks traffic twice: at the VCN and inside the VM.

1. **VCN security list** — Networking → Virtual cloud networks → your VCN → Subnets → the public subnet → Security Lists → *Default Security List* → **Add Ingress Rules**:

   | Source CIDR | Protocol | Destination port |
   |---|---|---|
   | `0.0.0.0/0` | TCP | 80 |
   | `0.0.0.0/0` | TCP | 443 |
   | `0.0.0.0/0` | UDP | 443 (optional, HTTP/3) |

2. **In-VM iptables** — Ubuntu images on OCI ship `/etc/iptables/rules.v4` that rejects everything but SSH. `setup.sh` inserts ACCEPT rules for 80/443 and saves them with `netfilter-persistent`; nothing to do by hand.

## 4 · Hostname (pick one)

- **Nothing** — `setup.sh` defaults to `<public-ip>.sslip.io`, a free wildcard DNS that resolves to the IP. Let's Encrypt issues certificates for it.
- **DuckDNS** — free subdomain, point it at the public IP, pass `--domain yourname.duckdns.org`.
- **Your own domain** — an `A` record to the public IP, pass `--domain n8n.yourco.ca`.

## 5 · Run the setup

```bash
ssh ubuntu@<public-ip>
git clone https://github.com/owaiskhalid-si/n8n-automation-pack
sudo bash n8n-automation-pack/infra/oracle/setup.sh --domain n8n.yourco.ca --email you@example.com
```

Flags: `--editor-ips "203.0.113.10/32"` locks the editor to your IP (webhooks stay public) · `--timezone` · `--backup-keep` · `--no-swap` · `--repo <url>` when not running from a checkout.

What it does:

1. Installs Docker, the Compose plugin, git, cron and unattended security upgrades.
2. Opens 80/443 in iptables and persists the rules.
3. Adds a 2 GB swap file.
4. Writes `infra/.env` with a generated `N8N_ENCRYPTION_KEY` and `POSTGRES_PASSWORD` (kept on re-runs).
5. `docker compose up -d` — n8n, Postgres and Caddy. Caddy fetches the certificate on the first request.
6. Schedules `infra/scripts/backup.sh` nightly at 03:15 (Postgres dump + workflow export, 14 kept under `/var/backups/n8n`; copied to S3 too if `BACKUP_BUCKET` is set).

Re-running the script is safe; it updates packages and containers and keeps your secrets.

## 6 · After the first boot

1. Open `https://<domain>` and create the owner account.
2. **Credentials**: add *Google Gemini (PaLM) API* with a key from [Google AI Studio](https://aistudio.google.com) (free tier), plus Google Sheets, Slack, Gmail, Twilio, SMTP, Postgres as needed, and a **Header Auth** credential named *Demo gateway key* (`X-Demo-Key`, long random value).
3. Copy `infra/credentials.example.json` → `infra/credentials.json`, paste the credential IDs (from each credential's URL), then on the VM:

   ```bash
   PROTECT=1 infra/scripts/deploy-workflows.sh
   ```

4. On Vercel set `N8N_WEBHOOK_BASE=https://<domain>` and `N8N_DEMO_KEY=<the header value>`.

## Operations

```bash
cd n8n-automation-pack/infra
docker compose logs -f n8n                 # logs
docker compose pull && docker compose up -d # update to N8N_VERSION in .env
scripts/backup.sh                          # ad-hoc backup
scripts/restore.sh n8n-<stamp>.dump        # restore from /var/backups/n8n (or S3)
```

- **Idle reclamation**: Oracle may stop Always Free instances that sit idle (CPU < 20 % for 7 days). n8n polling triggers plus Postgres keep it above that in practice; PAYG tenancies are exempt.
- **SSH only with keys** — the image disables password login. Keep port 22 closed to the world in the security list if you can (your IP only).
- **Resize later**: the A1 shape is flexible; change OCPU/RAM from the console without rebuilding.
