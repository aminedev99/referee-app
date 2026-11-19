import os
import uuid
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.migrations import run_migrations
from app.deps import get_db, get_current_user, require_admin
from app.models import User, Referee, Team, Match, Assignment, Receipt, Notification
from app.schemas import UserOut, UserUpdate, ChangePasswordInput, LoginResponse, AdminStatsOut
from app.security import (
    verify_password,
    verify_dummy_password,
    get_password_hash,
    create_access_token,
    validate_password_strength,
    COMMON_WEAK_PASSWORDS,
)
from app.services.rate_limiter import login_rate_limiter, get_client_ip
from app.services.phone import normalize_moroccan_phone

# Routers
from app.routers import (
    teams,
    referees,
    matches,
    assignments,
    me,
    receipts,
    notifications,
)

logger = logging.getLogger("referee_app")

def bootstrap_admin(db: Session) -> None:
    """
    Bootstrap the initial administrator if NO admin exists.
    If an admin already exists, do nothing (never overwrite or reset password from env).
    In production, refuses to start if ADMIN_EMAIL/PASSWORD are missing, <12 chars, or weak.
    """
    admin_count = db.query(User).filter(User.role == "admin").count()
    if admin_count > 0:
        return

    admin_email = (settings.ADMIN_EMAIL or "").strip().lower()
    admin_password = settings.ADMIN_PASSWORD or ""
    admin_name = (settings.ADMIN_NAME or "Administrator").strip()

    if settings.ENV == "production":
        if not admin_email or "@" not in admin_email:
            raise RuntimeError(
                "CRITICAL: Production startup failed: ADMIN_EMAIL must be provided and valid "
                "when bootstrapping the first admin."
            )
        if not admin_password or len(admin_password) < 12:
            raise RuntimeError(
                "CRITICAL: Production startup failed: ADMIN_PASSWORD must be at least 12 characters "
                "when bootstrapping the first admin."
            )
        if admin_password.lower() in COMMON_WEAK_PASSWORDS:
            raise RuntimeError(
                "CRITICAL: Production startup failed: ADMIN_PASSWORD is too common/weak. "
                "Choose a strong production password."
            )
    else:
        # Development fallback
        if not admin_email:
            admin_email = "admin@draarbitre.com"
        if not admin_password:
            admin_password = "AdminSecure2026!"

    logger.info("Bootstrapping initial admin account for %s...", admin_email)
    admin = User(
        email=admin_email,
        name=admin_name,
        hashed_password=get_password_hash(admin_password),
        role="admin",
        is_active=True,
        password_changed_at=datetime.now(timezone.utc),
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    logger.info("Admin account successfully bootstrapped.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables, run migrations, and bootstrap admin only
    Base.metadata.create_all(bind=engine)
    run_migrations()
    db = SessionLocal()
    try:
        bootstrap_admin(db)
    finally:
        db.close()
    yield

docs_url = "/docs" if settings.ENV == "development" else None
redoc_url = "/redoc" if settings.ENV == "development" else None
openapi_url = "/openapi.json" if settings.ENV == "development" else None

app = FastAPI(
    title="Referee Manager API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url=openapi_url,
)

# Global unhandled exception handler to hide stack traces in production
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        headers = getattr(exc, "headers", None)
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=headers,
        )

    req_id = str(uuid.uuid4())
    logger.exception("Unhandled error [request_id=%s] on %s %s: %s", req_id, request.method, request.url.path, exc)

    if settings.ENV == "production":
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error", "request_id": req_id},
        )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": str(exc), "request_id": req_id},
    )

# CORS: Only enabled in development mode. In production, Caddy serves frontend and proxies /api on same origin.
if settings.ENV == "development":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Health endpoint (public)
@app.get("/api/health")
def health():
    return {"status": "ok"}

# Auth endpoints
@app.post("/api/auth/login", response_model=LoginResponse)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> LoginResponse:
    ip = get_client_ip(request)
    identifier = form_data.username.strip().lower()

    # Rate limiting: 5/min per IP+email, 20/hr per IP
    login_rate_limiter.check_and_record(ip, identifier)

    # Find user by email or by referee alias email
    user = (
        db.query(User)
        .outerjoin(Referee, Referee.user_id == User.id)
        .filter(
            or_(
                User.email == identifier,
                Referee.email == identifier,
            )
        )
        .first()
    )

    # Constant-time comparison: if user is not found, verify against dummy hash
    if not user:
        verify_dummy_password(form_data.password)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    referee_id: Optional[str] = None
    phone_val: Optional[str] = None
    if user.role == "referee" and user.referee:
        referee_id = user.referee.id
        phone_val = user.referee.phone

    access_token = create_access_token(
        user_id=user.id,
        role=user.role,
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        user=UserOut(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            is_active=user.is_active,
            referee_id=referee_id,
            phone=phone_val,
        ),
    )

@app.get("/api/auth/me", response_model=UserOut)
def get_auth_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    referee_id: Optional[str] = None
    phone_val: Optional[str] = None
    if current_user.role == "referee" and current_user.referee:
        referee_id = current_user.referee.id
        phone_val = current_user.referee.phone

    return UserOut(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        is_active=current_user.is_active,
        referee_id=referee_id,
        phone=phone_val,
    )

@app.put("/api/auth/me", response_model=UserOut)
def update_auth_me(
    update_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserOut:
    new_name = update_in.full_name or update_in.name
    if new_name is not None and new_name.strip():
        current_user.name = new_name.strip()
        if current_user.referee:
            current_user.referee.name = new_name.strip()

    if update_in.phone is not None:
        normalized_phone = normalize_moroccan_phone(update_in.phone)
        if current_user.referee:
            current_user.referee.phone = normalized_phone

    db.commit()
    db.refresh(current_user)

    referee_id = current_user.referee.id if current_user.referee else None
    phone_val = current_user.referee.phone if current_user.referee else None

    return UserOut(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        is_active=current_user.is_active,
        referee_id=referee_id,
        phone=phone_val,
    )

@app.post("/api/auth/change-password")
def change_password(
    pwd_in: ChangePasswordInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(pwd_in.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    try:
        validate_password_strength(pwd_in.new_password, min_length=8)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )

    current_user.hashed_password = get_password_hash(pwd_in.new_password)
    current_user.password_changed_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok", "message": "Password changed successfully"}

@app.get("/api/admin/stats", response_model=AdminStatsOut)
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> AdminStatsOut:
    today_str = datetime.now().strftime("%Y-%m-%d")
    upcoming_count = db.query(Match).filter(Match.status != "cancelled", Match.date >= today_str).count()
    pending_count = db.query(Assignment).join(Match).filter(Match.status != "cancelled", Assignment.status == "pending").count()
    refused_count = db.query(Assignment).join(Match).filter(Match.status != "cancelled", Assignment.status == "refused").count()

    return AdminStatsOut(
        upcoming_matches=upcoming_count,
        pending_responses=pending_count,
        refused_this_month=refused_count,
    )

# Include API Routers under /api
app.include_router(teams.router, prefix="/api")
app.include_router(referees.router, prefix="/api")
app.include_router(matches.router, prefix="/api")
app.include_router(assignments.router, prefix="/api")
app.include_router(me.router, prefix="/api")
app.include_router(receipts.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
