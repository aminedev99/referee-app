# Referee Manager

Referee Manager is a full-stack basketball official management platform built with Next.js (App Router, Tailwind CSS, TypeScript) and FastAPI (Python, SQLAlchemy 2.x, PostgreSQL, PyJWT, ReportLab).

---

## Architecture Overview

- **Frontend**: Next.js 16 (App Router), Tailwind CSS, `@tanstack/react-query`, `react-hook-form`, `zod`, `lucide-react`. Runs on port `3000`.
- **Backend**: FastAPI, SQLAlchemy 2.x, Pydantic v2, PyJWT, ReportLab, Num2words. Runs on port `8000`.
- **Database**: PostgreSQL 16 on port `5432`.
- **Reverse Proxy**: Next.js rewrites `/api/:path*` to the FastAPI backend (`http://backend:8000` in Docker or `http://localhost:8000` in dev).
- **Mock Mode**: Fully supported via `NEXT_PUBLIC_USE_MOCK=true` with matching business rules and guards.

---

## Quick Start (Docker Compose)

### 1. Start the Complete Stack
Starts PostgreSQL, FastAPI backend, and Next.js frontend:

```bash
docker compose up --build -d
```
Access the application at:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs) (available when `ENV=development`)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 2. Start Only Database & Backend
Ideal when developing the frontend locally with `npm run dev`:

```bash
docker compose up --build -d db backend
```

Then in another terminal, run the frontend:
```bash
cd frontend
npm install
npm run dev
```

### 3. View Logs

```bash
# All services
docker compose logs -f

# Backend only
docker compose logs -f backend

# Frontend only
docker compose logs -f frontend
```

### 4. Reset Database & Generated Receipts

```bash
docker compose down -v
```

---

## Demo Credentials

| Role | Username / Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@referee.local` | `Admin12345!` | Full administrator access |
| **Referee** | `referee@referee.local` (or `y.elamrani@mail.ma`) | `Referee12345!` | Active official (Youssef El Amrani) |
| **Referee (Inactive)** | `h.mansouri@mail.ma` | `Referee12345!` | Deactivated official (Hassan Mansouri) |

---

## Summary of Implemented Business Rules

### Reported Bugs Fixed First
1. **Referee Profile Real Values (Bug 1)**:
   - Eliminated all mock and hardcoded fallback values for phone and license number.
   - Profile pages read ONLY from the API (`GET /referees/{id}` and `GET /me/profile`). Empty values strictly display `"Not provided"`.
2. **Sticky Action Bar on Match Creation & Edit (Bug 2)**:
   - `MatchForm` is a full-screen route with NO bottom tab bar (`hideBottomNav` prop on Navbar).
   - Fixed bottom action bar (above safe area) containing "Cancel" and primary action "Create match and send invitations" / "Save changes".
3. **Missing Edit Pages (Bug 3)**:
   - Built all missing routes: referee edit, match detail view, match edit, admin profile, referee profile, and team edit sheet.

### Part A. Route Protection
- **Backend**:
  - Every endpoint except `POST /api/auth/login` and `GET /api/health` requires a valid Bearer token via router-level dependencies (`require_admin` for admin routers, `require_referee` for `/me/*`).
  - Missing, invalid, or expired tokens return `401`. Inactive users return `401`. Non-admin users accessing admin endpoints return `403`.
  - Public documentation (`/docs`, `/redoc`, `/openapi.json`) is enabled only when `ENV=development`.
  - Receipt PDF download requires valid Bearer authentication (accessible only by admin or the assigned referee).
- **Frontend**:
  - Sets both `localStorage` token and `rm_token` cookie (with `Path=/`, `SameSite=Lax`, `Secure` on HTTPS) upon login.
  - `middleware.ts` decodes JWT payload (base64) to check expiration and enforce role boundaries (`/admin/*` for admins only, `/referee/*` for referees only).
  - Layout guards (`app/admin/layout.tsx`, `app/referee/layout.tsx`) query `GET /auth/me`, rendering a full-page skeleton to eliminate content flashing before verification.
  - Logout clears `localStorage`, `rm_token` cookie, and TanStack React Query cache.

### Part B. Backend Logic
- **Idempotent Migrations (`migrations.py`)**:
  - Executes isolated DDL commands at startup (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE UNIQUE INDEX IF NOT EXISTS`).
  - Added `matches.status` (`'scheduled'` | `'cancelled'`), `assignments.last_reminded_at`, `receipts.number` (`YYYY-NNNN`), and partial unique index on `referees.license_number`.
- **Moroccan Phone Normalization (`services/phone.py`)**:
  - Validates and converts Moroccan numbers (`06...`, `07...`, `+212...`, `00212...`) to canonical `+212XXXXXXXXX` on write. Invalid numbers return `400`.
- **Referees Management**:
  - Creation & edit with uniqueness checks on email and license (`409`).
  - Activate, deactivate, and password reset endpoints. Deactivated referees return `401` on login and are excluded from `GET /referees?active=true`.
  - Delete blocked with `409` ("Referee has assignments, deactivate instead") if referee has existing assignments.
- **Matches Management & Conflict Detection**:
  - Validations: future match date, `home != away`, at least one assignment, paying team validation, active referee verification.
  - Conflict detection: Rejects (`409`) if a referee is already assigned to another non-cancelled match within `±3 hours`.
  - Sync assignments on edit: changing match date, venue, or city resets assignments to `pending` and notifies referees.
  - Match cancellation (`POST /matches/{id}/cancel`): marks match as cancelled, sends notifications, renders assignments read-only.
- **Assignment State Machine (`me.py`)**:
  - Referees can switch `confirmed -> refused` and `refused -> confirmed` until 24 hours prior to match tip-off. Within 24 hours, returns `409` ("Too close to the match, contact the administration").
  - Computed `needs_attention`: flags pending assignments on matches scheduled within 24 hours ("No answer").
- **Receipts**:
  - Generated exclusively for confirmed assignments. Idempotent per assignment with sequential annual number format `YYYY-NNNN`.

---

## Frontend Checklist

- [x] **`app/admin/referees/[id]/edit/page.tsx`**: Prefilled form, phone formatting, Active toggle, Reset password modal, Danger zone with ConfirmDialogs.
- [x] **`app/admin/matches/[id]/page.tsx`**: Header action buttons (Edit, Cancel), Match info card, assignment list with "No answer" marker, Remind (12h throttled), Remove, Generate receipt, Download PDF.
- [x] **`app/admin/matches/[id]/edit/page.tsx`**: Reuses MatchForm with warning banner explaining confirmation resets.
- [x] **`app/admin/profile/page.tsx`**: Admin profile view, name edit form, change-password card, logout button.
- [x] **`app/referee/profile/page.tsx`**: Reads solely from `GET /me/profile`, formats phone, "Not provided" empty states, name and phone edit, change password, logout.
- [x] **`app/admin/teams/page.tsx`**: Edit and Add modes unified in the bottom sheet.
- [x] **`MatchForm.tsx`**: Sticky action bar above safe area, scroll to first zod error, summary confirmation modal, 409 conflict banner, active-only referee picker with search.
- [x] **Referee Assignment Screens**: Cancelled badge for cancelled matches, "Change to Refused" / "Change to Confirmed" buttons until 24h before match, 24h locked notice.
- [x] **Admin Assignments & Table**: "No answer" red badge for `needs_attention`, "Cancelled" badge for cancelled matches.
- [x] **Mock Mode Equivalence (`lib/mock.ts`)**: Mirrors all backend validations, conflict checks, phone normalization, and state machine transitions.

---

## Automated Verification

### Run Backend Tests (21 Tests, 100% Pass)
```bash
# In virtual environment:
$env:PYTHONPATH='backend'
pytest backend/tests/ -v
```

### Full Clean Stack & Migration Verification
```bash
docker compose down -v
docker compose up -d --build
pytest backend/tests/ -v
```

### Backend Restart Persistence Test
```bash
docker compose restart backend
# Data persists without regression
```

### Frontend Build & Lint Verification
```bash
cd frontend
npm run build
npm run lint
```
