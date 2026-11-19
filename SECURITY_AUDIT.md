# Security Audit & Hardening Report

**Project**: Referee Manager (Gestionnaire des Désignations d'Arbitres)  
**Date**: November 2026  
**Auditor**: Senior Security & DevOps Engineer  
**Status**: Complete & Verified (26/26 Automated Tests Passing)

---

## Executive Summary

| Category | Total Items | Pass | Fixed | Accepted-Risk |
| :--- | :---: | :---: | :---: | :---: |
| **Authentication & Sessions** | 8 | 1 | 6 | 1 |
| **Authorization & Access Control** | 5 | 0 | 5 | 0 |
| **Input & Output Validation** | 6 | 1 | 5 | 0 |
| **HTTP Security Headers** | 3 | 0 | 3 | 0 |
| **Dependencies & Supply Chain** | 5 | 1 | 3 | 1 |
| **Containers & Network Isolation** | 6 | 0 | 6 | 0 |
| **Total** | **33** | **3** | **28** | **2** |

---

## Comprehensive Audit Findings & Remediation

| # | Audit Item | Status | Remediation & Changes Implemented |
|---|------------|--------|-----------------------------------|
| 1 | **JWT Secret Strength & Production Validation** | **Fixed** | Refuses to start in `ENV=production` if `JWT_SECRET` is missing, shorter than 32 characters, or matches default/dev values (`backend/app/config.py`). Validated via test `test_weak_jwt_secret_refuses_production_start`. |
| 2 | **Token Structure & Lifetime** | **Fixed** | `backend/app/security.py` strictly restricts claims to `sub`, `role`, `exp`, `iat`. User active status and role are re-verified from database on every single request in `backend/app/deps.py`. Token lifetime configured via `JWT_EXPIRE_MINUTES` (default 720). |
| 3 | **Password Complexity & Weak List Blacklist** | **Fixed** | Enforced 8-character minimum across create, reset, and change password operations. Rejects common weak passwords (`password`, `12345678`, `Admin12345!`, `Referee12345!`, etc.) via `validate_password_strength()` in `backend/app/security.py`. |
| 4 | **Login Rate Limiting** | **Fixed** | Thread-safe `LoginRateLimiter` in `backend/app/services/rate_limiter.py` enforces maximum 5 attempts per minute per IP+email and 20 per hour per IP. Returns HTTP 429 with `Retry-After` header. Honors `X-Forwarded-For` through trusted proxy configuration. |
| 5 | **Timing Attack Mitigation on Login** | **Fixed** | Constant-time password verification implemented in `backend/app/main.py`. Unknown emails calculate bcrypt against a precomputed dummy hash (`DUMMY_BCRYPT_HASH`), returning identical error messages ("Identifiants invalides"). |
| 6 | **Server-Side Session Invalidation on Password Change** | **Fixed** | Added `password_changed_at` timestamp column to `User` model. `backend/app/deps.py` rejects any JWT issued (`iat`) before `user.password_changed_at`, immediately terminating all other active sessions upon password reset or change. |
| 7 | **Authentication Cookies Hardening** | **Fixed** | `rm_token` cookie configured with `Path=/`, `SameSite=Lax`, and `Secure=True` when running under HTTPS. Contains strictly the JWT string and no application state or credentials. |
| 8 | **Token Storage Tradeoff (localStorage vs CSP)** | **Accepted-risk** | Storing JWT in `localStorage` exposes tokens if an XSS vulnerability exists. Accepted because client-side Single Page Application architecture requires programmatic Authorization header attachments. Mitigated with strict Content Security Policy (`frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`), `X-Content-Type-Options: nosniff`, and edge authentication middleware. |
| 9 | **Universal API Route Protection** | **Fixed** | Automated test `test_all_api_routes_require_authentication` verifies all 29 OpenAPI routes require valid authentication. Only `POST /api/auth/login` and `GET /api/health` are publicly accessible. Admin routers strictly require `require_admin`. |
| 10 | **IDOR & Multi-Tenant Scoping** | **Fixed** | All referee endpoints (`/api/me/*`, `/api/notifications/*`, `/api/assignments/*`) are strictly scoped to `current_user.referee.id`. Tested in `test_idor_referee_isolation`: Referee A receives 404/403 when attempting to access or modify Referee B's data. |
| 11 | **Receipt PDF Path Traversal Protection** | **Fixed** | `backend/app/routers/receipts.py` resolves canonical path using `os.path.realpath` and verifies that the resolved file strictly resides within `RECEIPTS_DIR` before serving. Served with `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`. |
| 12 | **Mass Assignment Prevention** | **Fixed** | All Pydantic input schemas in `backend/app/schemas.py` enforce `model_config = ConfigDict(extra="forbid")`. Clients cannot inject unauthorized fields (`role`, `is_active`, `password_changed_at`, etc.). |
| 13 | **Database Access Hardening & SQL Injection Prevention** | **Pass** | All database queries are constructed using SQLAlchemy ORM 2.x and parameterized queries. No raw `text()` or string interpolation (`f-strings`) exist in queries. |
| 14 | **Input Bounds & Field Validation** | **Fixed** | Strict length bounds on all string inputs (`name: max_length=120`, `venue: max_length=150`), indemnity bound `0 < x <= 100000`, regex email validation, and strict enum constraints for division, category, and referee function. |
| 15 | **Production Error Masking & Request Correlation** | **Fixed** | Added global exception handler in `backend/app/main.py`. In `ENV=production`, internal exceptions return generic HTTP 500 `{"detail": "Internal server error", "request_id": "<uuid>"}` while full stack traces are logged server-side with correlated request IDs. |
| 16 | **API Documentation Exposure in Production** | **Fixed** | Disabled `/docs`, `/redoc`, and `/openapi.json` when `ENV=production`. Only accessible in `ENV=development`. |
| 17 | **Frontend Security & Source Maps** | **Fixed** | Disabled production source maps (`productionBrowserSourceMaps: false`) and disabled `poweredByHeader` in `frontend/next.config.ts`. Verified no `dangerouslySetInnerHTML` is used. |
| 18 | **CORS Policy Hardening** | **Fixed** | Permissive wildcard CORS removed. In production, CORS middleware is disabled because Caddy serves the frontend and backend on the same origin (`/api/*`). Dev-only CORS is scoped strictly to `http://localhost:3000`. |
| 19 | **Caddy HTTP Security Headers** | **Fixed** | `Caddyfile` sets: HSTS (`max-age=31536000; includeSubDomains`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, removed `Server` header. |
| 20 | **Content Security Policy (CSP)** | **Fixed** | Production CSP enforced: `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`. Inline scripts and styles permitted strictly for Next.js hydration bootstrap. |
| 21 | **API Cache-Control Headers** | **Fixed** | `Caddyfile` adds `Cache-Control: no-store` to all `/api/*` responses to prevent sensitive user or match data caching in proxies or browsers. |
| 22 | **Backend Dependencies Audit & Upgrades** | **Fixed** | Executed `pip-audit`. Upgraded `python-multipart` to `0.0.34`, `pyjwt` to `2.15.1`, `pytest` to `9.2.0`. Pinned all packages to exact versions in `backend/requirements.txt`. |
| 23 | **Starlette Transitive Dependency Constraint** | **Accepted-risk** | `starlette 0.45.3` is a pinned dependency of `fastapi==0.115.8`. Starlette CVEs relate to multipart parser limits; mitigated by FastAPI input validation bounds, reverse proxy request buffering in Caddy, and absence of public file upload endpoints. |
| 24 | **Frontend Dependencies Audit** | **Pass** | Executed `npm audit --omit=dev` in `frontend/`. 0 vulnerabilities discovered. Committed `package-lock.json`. |
| 25 | **Docker Build Context & Ignore Rules** | **Fixed** | Created `.dockerignore` files for both `backend` and `frontend`, excluding `.git`, `.env*`, `node_modules`, `.next`, `receipts`, `backups`, and `__pycache__`. |
| 26 | **Git Secrets Scrubbing** | **Pass** | Verified repository `.gitignore` covers `.env`, `.env.*`, `pgdata/`, `receipts/`, `backups/`. Scanned repository for leaked API keys, tokens, or default production secrets: zero secrets committed. |
| 27 | **Non-Root Container Execution** | **Fixed** | `backend/Dockerfile` runs as `appuser` (UID 1001). `frontend/Dockerfile` runs as `nextjs` (UID 1001). Neither container executes with root privileges. |
| 28 | **Container Multi-Stage Minimal Images** | **Fixed** | Both Dockerfiles use multi-stage builds. Build compilers (`build-essential`, `libc6-compat`) are isolated to builder stages; runtime images use `python:3.11-slim` and `node:20-alpine`. |
| 29 | **Network Isolation in Production** | **Fixed** | In `docker-compose.prod.yml`, only `caddy` exposes public ports 80 and 443. `db`, `backend`, and `frontend` communicate over an internal Docker bridge network (`referee_internal`) with no external port publication. |
| 30 | **PostgreSQL Access Restriction** | **Fixed** | PostgreSQL port 5432 is never mapped to host interfaces in production. Accessible exclusively within `referee_internal`. |
| 31 | **Container Healthchecks & Auto-Recovery** | **Fixed** | Added automated healthchecks for PostgreSQL (`pg_isready`), backend (`/api/health` via curl), frontend, and Caddy. Services set to `restart: unless-stopped`. |
| 32 | **Log Rotation & Resource Limits** | **Fixed** | Configured Docker `logging` driver for all containers: `json-file` with `max-size: 10m` and `max-file: 3`. Configured memory limits (`db: 512m`, `backend: 512m`, `frontend: 512m`, `caddy: 256m`). |
| 33 | **Admin Bootstrap & CLI Emergency Reset** | **Fixed** | Added `bootstrap_admin()` in `backend/app/main.py`. On initial startup, creates single admin from environment if no admin exists; never overwrites on restart. Refuses production start if password is weak. Added CLI commands `app.cli reset-admin-password` and `app.cli create-admin`. |

---

## Detailed Accepted-Risk Justifications

### 1. Client-Side JWT Storage in `localStorage`
- **Threat**: If malicious JavaScript executes on the client (XSS), it could read the JWT token from `localStorage`.
- **Justification**: The frontend is a Next.js Single Page Application where API requests are initiated from client-side React Query hooks requiring the Bearer Authorization header. Storing the token in memory alone would log users out on every page reload or tab switch.
- **Mitigating Controls**:
  1. Strict Content Security Policy (CSP) blocking external scripts, objects, and framing (`frame-ancestors 'none'`).
  2. Input sanitization across the backend with Pydantic `extra="forbid"` and HTML escaping in React (no `dangerouslySetInnerHTML`).
  3. `X-Content-Type-Options: nosniff` header preventing MIME confusion attacks.
  4. Redundant edge `rm_token` cookie set with `SameSite=Lax` and `Secure=True` for middleware routing.

### 2. Transitive Dependency `starlette==0.45.3`
- **Threat**: Known Starlette CVEs reported by `pip-audit` regarding multipart parser denial of service and streaming behavior.
- **Justification**: `starlette==0.45.3` is strictly pinned by the LTS release `fastapi==0.115.8` (`starlette>=0.40.0,<0.46.0`). Upgrading Starlette independently causes dependency resolution failure with FastAPI.
- **Mitigating Controls**:
  1. Referee Manager does not expose multipart upload endpoints for untrusted public users; file downloads are served strictly through authenticated endpoints.
  2. Caddy reverse proxy buffers requests and enforces strict HTTP request size limits before forwarding to Uvicorn.
  3. Uvicorn runs with trusted proxy headers and connection limits behind Caddy.
