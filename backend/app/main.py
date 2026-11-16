import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.deps import get_db, get_current_user, require_admin
from app.models import User, Referee, Team, Match, Assignment, Receipt, Notification
from app.schemas import UserOut, LoginResponse, AdminStatsOut
from app.security import verify_password, get_password_hash, create_access_token
from app.services.receipts import generate_receipt_pdf, get_amount_in_words_fr
from app.services.notifications import notify

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

def seed_database(db: Session) -> None:
    # 1. Admin Seed
    admin = db.query(User).filter(User.email == settings.SEED_ADMIN_EMAIL).first()
    if not admin:
        admin = User(
            email=settings.SEED_ADMIN_EMAIL,
            name="System Admin",
            hashed_password=get_password_hash(settings.SEED_ADMIN_PASSWORD),
            role="admin",
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

    # Check if teams exist
    if db.query(Team).count() > 0:
        return

    print("Seeding initial Moroccan basketball data...")

    # 2. Teams
    teams_data = [
        {"name": "Wydad AC", "city": "Casablanca"},
        {"name": "Raja CA", "city": "Casablanca"},
        {"name": "FUS Rabat", "city": "Rabat"},
        {"name": "AS Salé", "city": "Salé"},
        {"name": "IR Tanger", "city": "Tanger"},
        {"name": "KAC Kénitra", "city": "Kénitra"},
    ]
    created_teams: dict[str, Team] = {}
    for td in teams_data:
        t = Team(name=td["name"], city=td["city"])
        db.add(t)
        created_teams[td["name"]] = t
    db.flush()

    # 3. Referees
    ref_pw = get_password_hash("Referee12345!")
    referees_data = [
        {
            "name": "Youssef El Amrani",
            "email": "referee@referee.local",
            "alias_email": "y.elamrani@mail.ma",
            "phone": "06 61 23 45 67",
            "license": "1104",
            "category": "National Referee",
        },
        {
            "name": "Karim Benali",
            "email": "k.benali@mail.ma",
            "phone": "06 62 34 56 78",
            "license": "1088",
            "category": "Regional Referee",
        },
        {
            "name": "Sara Idrissi",
            "email": "s.idrissi@mail.ma",
            "phone": "06 63 45 67 89",
            "license": "1104",
            "category": "National Referee",
        },
        {
            "name": "Omar Tazi",
            "email": "o.tazi@mail.ma",
            "phone": "06 64 56 78 90",
            "license": "1120",
            "category": "Regional Referee",
        },
    ]
    created_refs: dict[str, Referee] = {}
    for rd in referees_data:
        u = User(
            email=rd["email"],
            name=rd["name"],
            hashed_password=ref_pw,
            role="referee",
        )
        db.add(u)
        db.flush()

        ref = Referee(
            user_id=u.id,
            name=rd["name"],
            email=rd.get("alias_email", rd["email"]),
            phone=rd["phone"],
            license_number=rd["license"],
            category=rd["category"],
        )
        db.add(ref)
        created_refs[rd["name"]] = ref
    db.flush()

    # 4. Matches
    matches_data = [
        # Upcoming
        {
            "number": "2026-88",
            "home": "Wydad AC",
            "away": "Raja CA",
            "date": "2026-11-22",
            "time": "18:30",
            "city": "Casablanca",
            "venue": "Salle Mohammed V",
            "div": "1DV",
            "cat": "Men",
            "asgs": [
                {"ref": "Youssef El Amrani", "fn": "Main referee", "ind": 400.0, "paying": "Wydad AC", "status": "pending"},
                {"ref": "Karim Benali", "fn": "Second referee", "ind": 300.0, "paying": "Raja CA", "status": "confirmed"},
            ],
        },
        {
            "number": "2026-89",
            "home": "FUS Rabat",
            "away": "AS Salé",
            "date": "2026-11-23",
            "time": "16:00",
            "city": "Rabat",
            "venue": "Salle Moulay Abdallah",
            "div": "2DV",
            "cat": "Women",
            "asgs": [
                {"ref": "Youssef El Amrani", "fn": "Second referee", "ind": 300.0, "paying": "FUS Rabat", "status": "pending"},
                {"ref": "Karim Benali", "fn": "Main referee", "ind": 400.0, "paying": "AS Salé", "status": "refused", "reason": "unavailable that weekend"},
            ],
        },
        {
            "number": "2026-90",
            "home": "IR Tanger",
            "away": "KAC Kénitra",
            "date": "2026-11-26",
            "time": "19:00",
            "city": "Tanger",
            "venue": "Salle Ziatin",
            "div": "1DV",
            "cat": "Men",
            "asgs": [
                {"ref": "Youssef El Amrani", "fn": "Main referee", "ind": 400.0, "paying": "IR Tanger", "status": "confirmed"},
                {"ref": "Karim Benali", "fn": "Second referee", "ind": 350.0, "paying": "KAC Kénitra", "status": "refused", "reason": "unavailable that weekend"},
            ],
        },
        # Past
        {
            "number": "2026-75",
            "home": "Raja CA",
            "away": "FUS Rabat",
            "date": "2026-11-15",
            "time": "17:00",
            "city": "Casablanca",
            "venue": "Salle Mohammed V",
            "div": "1DV",
            "cat": "Men",
            "asgs": [
                {"ref": "Youssef El Amrani", "fn": "Main referee", "ind": 400.0, "paying": "Raja CA", "status": "confirmed", "receipt": True},
            ],
        },
        {
            "number": "2026-70",
            "home": "AS Salé",
            "away": "IR Tanger",
            "date": "2026-11-08",
            "time": "18:00",
            "city": "Salé",
            "venue": "Salle Fathallah El Bouazzaoui",
            "div": "1DV",
            "cat": "Men",
            "asgs": [
                {"ref": "Youssef El Amrani", "fn": "Main referee", "ind": 350.0, "paying": "AS Salé", "status": "confirmed", "receipt": True},
            ],
        },
        {
            "number": "2026-64",
            "home": "KAC Kénitra",
            "away": "Wydad AC",
            "date": "2026-11-01",
            "time": "16:30",
            "city": "Kénitra",
            "venue": "Salle Al Wahda",
            "div": "2DV",
            "cat": "Men",
            "asgs": [
                {"ref": "Youssef El Amrani", "fn": "Second referee", "ind": 300.0, "paying": "KAC Kénitra", "status": "refused", "reason": "Family emergency"},
            ],
        },
    ]

    receipt_counter = 1
    for md in matches_data:
        m = Match(
            match_number=md["number"],
            home_team_id=created_teams[md["home"]].id,
            away_team_id=created_teams[md["away"]].id,
            date=md["date"],
            time=md["time"],
            city=md["city"],
            venue=md["venue"],
            division=md["div"],
            category=md["cat"],
            created_by_id=admin.id,
        )
        db.add(m)
        db.flush()

        for ad in md["asgs"]:
            ref = created_refs[ad["ref"]]
            paying = created_teams[ad["paying"]]
            asg = Assignment(
                match_id=m.id,
                referee_id=ref.id,
                referee_function=ad["fn"],
                indemnity=ad["ind"],
                paying_team_id=paying.id,
                status=ad["status"],
                refusal_reason=ad.get("reason"),
            )
            db.add(asg)
            db.flush()

            if ad.get("receipt"):
                rcpt_num = f"2026-{receipt_counter:04d}"
                receipt_counter += 1
                amount_words = get_amount_in_words_fr(ad["ind"])
                rcpt = Receipt(
                    assignment_id=asg.id,
                    receipt_number=rcpt_num,
                    issued_at="16 Nov 2026",
                    amount=float(ad["ind"]),
                    amount_in_words=amount_words,
                    pdf_path="",
                )
                db.add(rcpt)
                db.flush()
                try:
                    pdf_path = generate_receipt_pdf(
                        receipt=rcpt,
                        assignment=asg,
                        referee=ref,
                        match=m,
                        paying_team=paying,
                    )
                    rcpt.pdf_path = pdf_path
                except Exception as ex:
                    print("Could not generate receipt PDF during seed:", ex)

    # 5. Initial Notifications
    youssef_ref = created_refs.get("Youssef El Amrani")
    if youssef_ref and youssef_ref.user_id:
        notify(db, youssef_ref.user_id, "Wydad AC vs Raja CA, 22 Nov 2026", type="assignment", title="New assignment")
        notify(db, youssef_ref.user_id, "Raja CA vs FUS Rabat", type="receipt", title="Receipt available")

    notify(db, admin.id, "Karim Benali refused FUS Rabat vs AS Salé", type="refusal", title="Karim Benali refused")
    notify(db, admin.id, "Youssef El Amrani confirmed Wydad AC vs Raja CA", type="confirmation", title="Youssef El Amrani confirmed")

    db.commit()
    print("Database successfully seeded.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield
    # Shutdown

app = FastAPI(
    title="Referee Manager API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware (permissive for local development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health endpoint
@app.get("/api/health")
def health():
    return {"status": "ok"}

# Auth endpoints
@app.post("/api/auth/login", response_model=LoginResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> LoginResponse:
    identifier = form_data.username.strip().lower()

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

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    referee_id: Optional[str] = None
    if user.role == "referee" and user.referee:
        referee_id = user.referee.id

    access_token = create_access_token(
        data={"sub": user.id, "role": user.role, "email": user.email}
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
            referee_id=referee_id,
        ),
    )

@app.get("/api/auth/me", response_model=UserOut)
def get_auth_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    referee_id: Optional[str] = None
    if current_user.role == "referee" and current_user.referee:
        referee_id = current_user.referee.id

    return UserOut(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        referee_id=referee_id,
    )

@app.get("/api/admin/stats", response_model=AdminStatsOut)
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> AdminStatsOut:
    today_str = datetime.now().strftime("%Y-%m-%d")
    upcoming_count = db.query(Match).filter(Match.date >= today_str).count()
    pending_count = db.query(Assignment).filter(Assignment.status == "pending").count()
    refused_count = db.query(Assignment).filter(Assignment.status == "refused").count()

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
