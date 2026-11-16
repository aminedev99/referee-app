# Referee Manager

Referee Manager is a full-stack basketball official management platform built with Next.js (App Router, Tailwind CSS, TypeScript) and FastAPI (Python, SQLAlchemy 2.x, PostgreSQL, PyJWT, ReportLab).

---

## Architecture Overview

- **Frontend**: Next.js 16 (App Router), Tailwind CSS, `@tanstack/react-query`, `react-hook-form`, `zod`, `lucide-react`. Runs on port `3000`.
- **Backend**: FastAPI, SQLAlchemy 2.x, Pydantic v2, PyJWT, ReportLab, Num2words. Runs on port `8000`.
- **Database**: PostgreSQL 16 on port `5432`.
- **Reverse Proxy**: Next.js rewrites `/api/:path*` to the FastAPI backend (`http://backend:8000` in Docker or `http://localhost:8000` in dev).

---

## Quick Start (Docker Compose)

### 1. Start the Complete Stack
Starts PostgreSQL, FastAPI backend, and Next.js frontend:

```bash
docker compose up --build -d
```
Access the application at:
- **Frontend**: http://localhost:3000
- **Backend API & Swagger Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health

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

| Role | Username / Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@referee.local` | `Admin12345!` |
| **Referee** | `referee@referee.local` (or `y.elamrani@mail.ma`) | `Referee12345!` |

---

## Running Backend Tests

With `db` and `backend` running (or locally on port 8000):

```bash
pytest backend/tests/test_flow.py -v
```
