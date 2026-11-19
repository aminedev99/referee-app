# Referee Manager (Gestionnaire des Désignations d'Arbitres)

Referee Manager is a full-stack basketball official management platform built with Next.js 16 (App Router, Tailwind CSS, TypeScript), FastAPI (Python 3.11, SQLAlchemy 2.x, PostgreSQL 16, PyJWT, ReportLab), and Docker.

---

## Architecture Overview

- **Frontend**: Next.js 16 (App Router), Tailwind CSS, `@tanstack/react-query`, `react-hook-form`, `zod`, `lucide-react`. Runs on unprivileged `nextjs` (UID 1001).
- **Backend**: FastAPI, SQLAlchemy 2.x, Pydantic v2 (`extra="forbid"`), PyJWT, ReportLab, Num2words. Runs on unprivileged `appuser` (UID 1001).
- **Database**: PostgreSQL 16 Alpine. Internal network only in production.
- **Reverse Proxy & HTTPS**: Caddy 2 Alpine providing automatic HTTPS, security headers (HSTS, CSP, nosniff, DENY), and single-origin routing (`/api/*` to backend:8000, rest to frontend:3000).
- **Data Flow**: Exactly one single path — the real PostgreSQL database and FastAPI endpoints. All mock data and mock flags have been completely removed.

---

## Production Deployment

For complete VPS setup, Ubuntu 24.04 hardening, SSL configuration, daily backups, and disaster recovery:

👉 **[See DEPLOY.md](DEPLOY.md)**

For the full security audit and verification findings:

👉 **[See SECURITY_AUDIT.md](SECURITY_AUDIT.md)**

---

## Local Development (Docker Compose)

### 1. Start the Development Stack
Starts PostgreSQL, FastAPI backend (with hot-reload), and Next.js frontend bound to `127.0.0.1`:

```bash
docker compose up --build -d
```
Access the application:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs) (enabled only when `ENV=development`)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 2. Admin Account Bootstrap
On the first launch with an empty database, the backend automatically bootstraps the administrator account specified by the environment variables:
- **Email**: `ADMIN_EMAIL` (default in dev: `admin@draarbitre.com`)
- **Password**: `ADMIN_PASSWORD` (default in dev: `AdminSecure2026!`)
- **Name**: `ADMIN_NAME` (default in dev: `Administrator`)

No demo teams, referees, or matches are seeded. The administrator creates clubs, referees, matches, and assignments through the interface.

### 3. Emergency Admin CLI Commands
To reset an administrator password or create a second administrator directly via CLI:

```bash
# Reset administrator password
docker compose exec backend python -m app.cli reset-admin-password

# Create an additional administrator
docker compose exec backend python -m app.cli create-admin
```

---

## Automated Verification & Testing

### Run Backend Tests (26 Tests, 100% Pass)
```bash
# Run pytest in the test container or virtual environment:
docker compose exec backend pytest tests/ -v
```

Tests cover:
- Production refusal on weak or short JWT secret (<32 chars or dev defaults)
- Admin bootstrap policy (idempotent, never overwrites on restart)
- Password complexity validation and common weak password rejection
- Login rate limiting (429 with `Retry-After` header)
- Constant-time login comparison against dummy bcrypt hash
- Mass assignment protection (`extra="forbid"`)
- Server-side token invalidation upon password change (`password_changed_at`)
- Multi-tenant IDOR protection (strict referee isolation)
- Route protection (every `/api` route requires valid token except `/auth/login` and `/health`)
- Phone normalization (Moroccan format `+212...`)
- Conflict detection and match scheduling validations
- Receipt sequential numbering and path traversal protection

### Frontend Build & Lint Verification
```bash
cd frontend
npm run lint
npm run build
```
Builds cleanly with standalone output and 0 ESLint errors.
