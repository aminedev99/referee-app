# Production Deployment Guide: Referee Manager

**Target Environment**: Hostinger VPS, Ubuntu 24.04 LTS  
**Domains**:
- `draarbitre.com` — Public Application & Referee Portal
- `admin.draarbitre.com` — Administration Dashboard & VPS Access Host
**Architecture**: Single origin reverse proxy via Caddy (automatic Let's Encrypt HTTPS for both domains), routing `/api/*` to FastAPI backend and all other routes to Next.js frontend, backed by PostgreSQL 16.

---

## 1. Domain & DNS Configuration (Hostinger / Registrar)

Before running the deployment scripts on your VPS, configure the following DNS records in your domain registrar / Hostinger DNS Zone so that both domains point to your VPS IP:

| Type | Name / Host | Value / Target | Purpose |
| :--- | :--- | :--- | :--- |
| **A** | `@` (`draarbitre.com`) | `<YOUR_VPS_IP>` | Public App access for referees, matches & clubs |
| **A** | `admin` (`admin.draarbitre.com`) | `<YOUR_VPS_IP>` | Admin portal & direct VPS management access |
| **CNAME** | `www` (`www.draarbitre.com`) | `draarbitre.com` | Web alias (optional) |

> [!NOTE]
> Once DNS propagation completes, you can access the VPS directly via SSH using the admin domain:
> ```bash
> ssh root@admin.draarbitre.com
> ```

---

## 2. Quick Reference: The 5 Deployment Commands

On your clean Ubuntu 24.04 LTS VPS:

```bash
# 1. Update system and install Docker CE & Docker Compose
curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker $USER && newgrp docker

# 2. Clone the repository
git clone <YOUR_GIT_REPOSITORY_URL> /opt/referee-app && cd /opt/referee-app

# 3. Generate secure production environment for both domains (saves .env with chmod 600)
bash scripts/gen-env.sh admin.draarbitre.com admin@draarbitre.com draarbitre.com

# 4. Deploy the production stack (builds non-root images, starts containers, verifies health)
bash scripts/deploy.sh

# 5. Configure automated daily backups (runs at 03:00 daily, retains 14 days)
(crontab -l 2>/dev/null; echo "0 3 * * * cd /opt/referee-app && bash scripts/backup.sh >> /var/log/referee-backup.log 2>&1") | crontab -
```

---

## 3. Server Preparation & Hardening (Ubuntu 24.04 LTS)

### A. System Packages & Firewall (`ufw`)
Ensure only SSH (22), HTTP (80), and HTTPS (443) are exposed to the public internet:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ufw fail2ban curl git jq

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment "SSH"
sudo ufw allow 80/tcp comment "HTTP (Caddy Let's Encrypt)"
sudo ufw allow 443/tcp comment "HTTPS (Caddy)"
sudo ufw --force enable
sudo ufw status verbose
```

### B. Fail2ban Setup
Protect SSH against brute-force login attacks:

```bash
sudo systemctl enable --now fail2ban
sudo systemctl status fail2ban
```

---

## 4. Production Environment Generation (`scripts/gen-env.sh`)

The script `scripts/gen-env.sh` accepts domain arguments and automatically generates cryptographically strong random credentials using `openssl rand -hex` and creates the `.env` file with `chmod 600` permissions.

```bash
# Usage: bash scripts/gen-env.sh [DOMAIN] [ADMIN_EMAIL] [APP_DOMAIN]
bash scripts/gen-env.sh admin.draarbitre.com admin@draarbitre.com draarbitre.com
```

### Generated Parameters in `.env`
- `DOMAIN`: Admin / VPS domain (`admin.draarbitre.com`).
- `APP_DOMAIN`: Public application domain (`draarbitre.com`).
- `ENV`: Set to `production` (enforces strict security guards, hides debug traces).
- `POSTGRES_USER`: Dedicated database user (`referee_user`).
- `POSTGRES_PASSWORD`: 48-character random hex database password.
- `POSTGRES_DB`: `referee_db`.
- `DATABASE_URL`: Internal connection string `postgresql://referee_user:<PASS>@db:5432/referee_db`.
- `JWT_SECRET`: 64-character random hex secret (HS256).
- `JWT_EXPIRE_MINUTES`: `720` (12 hours).
- `ADMIN_EMAIL`: Initial admin login email (`admin@draarbitre.com`).
- `ADMIN_PASSWORD`: 20-character random password (displayed **once** upon generation).
- `ADMIN_NAME`: `Administrator`.

> [!IMPORTANT]
> The generated administrator credentials are printed to stdout **only once** when running `scripts/gen-env.sh`. Note them securely in your password manager.

---

## 5. Production Deployment (`scripts/deploy.sh`)

The deployment script executes the complete build, start, and verification cycle:
1. Validates that `.env` exists and contains production parameters.
2. Creates the `./receipts` storage directory with correct write permissions.
3. Builds the non-root multi-stage Docker images (`backend` and `frontend`).
4. Launches the stack using `docker-compose.prod.yml`.
5. Waits for internal services to become healthy.
6. Executes smoke tests on both `https://admin.draarbitre.com/api/health` and `https://draarbitre.com/api/health`.

```bash
bash scripts/deploy.sh
```

To view real-time container status:
```bash
docker compose -f docker-compose.prod.yml ps
```

---

## 6. Multi-Domain Routing & Architecture (`Caddyfile`)

Caddy acts as the unified edge router and automatic TLS certificate manager for **both** domains:

```mermaid
flowchart TD
    Internet[Internet: 80 / 443] -->|Automatic HTTPS| Caddy[Caddy Reverse Proxy]
    subgraph Domains Served
        D1[draarbitre.com - App Portal]
        D2[admin.draarbitre.com - Admin & VPS Portal]
    end
    D1 -.-> Caddy
    D2 -.-> Caddy
    subgraph referee_internal [Internal Docker Network]
        Caddy -->|/api/*| Backend[FastAPI Backend :8000]
        Caddy -->|/*| Frontend[Next.js Frontend :3000]
        Backend -->|Internal TCP 5432| DB[(PostgreSQL 16)]
        Backend --> ReceiptsVol[(./receipts Volume)]
    end
```

- **Dual-Domain Automatic TLS**: Caddy provisions and auto-renews Let's Encrypt certificates for both `draarbitre.com` and `admin.draarbitre.com`.
- **Public App Access**: Referees and clubs access the application seamlessly via `https://draarbitre.com`.
- **Admin / VPS Access**: Administrators can access the management portal via `https://admin.draarbitre.com` (and access the VPS host via `ssh root@admin.draarbitre.com`).
- **Security Headers**: HSTS, CSP, `X-Frame-Options: DENY`, `no-store` on `/api/*` are enforced on all origins.

---

## 7. Emergency Admin CLI Commands

If you ever need to reset the admin password or create an additional administrator directly on the server without UI access, use the emergency CLI tools:

### Reset Administrator Password
Prompts for a new password (min 12 characters, strong checks), updates `password_changed_at`, and invalidates all existing sessions:

```bash
docker compose -f docker-compose.prod.yml exec backend python -m app.cli reset-admin-password
```

### Create an Additional Administrator Account
Creates a new administrator user with email, name, and strong password:

```bash
docker compose -f docker-compose.prod.yml exec backend python -m app.cli create-admin
```

---

## 8. Backups and Disaster Recovery

### Manual Backup
Generates a gzipped PostgreSQL dump and a tarball of all generated PDF receipts in `./backups`:

```bash
bash scripts/backup.sh
```

### Restore from Backup
To restore the database and receipts after an incident or migration:

```bash
# 1. List available backup timestamps
ls -l backups/

# 2. Run restore (requires typing 'RESTORE' to prevent accidental execution)
bash scripts/restore.sh <YYYYMMDD_HHMMSS>
```

---

## 9. Verification & Troubleshooting

### Verify SSL & Health for Both Domains
Test both the public app domain and the admin/VPS domain:

```bash
# 1. Admin & VPS access health check
curl -I https://admin.draarbitre.com/api/health

# 2. Main App domain health check
curl -I https://draarbitre.com/api/health
```

Expected response for both:
```http
HTTP/2 200
content-type: application/json
strict-transport-security: max-age=31536000; includeSubDomains
x-content-type-options: nosniff
x-frame-options: DENY
cache-control: no-store
```

### Check Service Health & Logs
```bash
# View aggregated live logs
docker compose -f docker-compose.prod.yml logs -f

# Inspect specific container logs
docker compose -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f db
```

### Update / Redeploy Application Code
When deploying new changes from Git:
```bash
git pull origin main
bash scripts/deploy.sh
```
