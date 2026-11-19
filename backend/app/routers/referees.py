from datetime import datetime, timezone
import secrets
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.deps import get_db, require_admin
from app.models import Referee, User, Assignment, Match
from app.schemas import (
    RefereeOut,
    RefereeCreate,
    RefereeUpdate,
    RefereeDetailOut,
    ResetPasswordInput,
)
from app.security import get_password_hash, validate_password_strength
from app.services.stats import get_referees_stats_map, get_referee_stats
from app.services.phone import normalize_moroccan_phone

router = APIRouter(prefix="/referees", tags=["referees"], dependencies=[Depends(require_admin)])

@router.get("", response_model=List[RefereeOut])
def get_referees(
    q: Optional[str] = Query(None),
    active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> List[RefereeOut]:
    query = db.query(Referee)

    if active is not None:
        query = query.filter(Referee.is_active == active)

    if q and q.strip():
        search = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Referee.name.ilike(search),
                Referee.email.ilike(search),
                Referee.license_number.ilike(search),
            )
        )

    referees = query.order_by(Referee.name.asc()).all()
    if not referees:
        return []

    ref_ids = [r.id for r in referees]
    stats_map = get_referees_stats_map(db, ref_ids)

    results: List[RefereeOut] = []
    for r in referees:
        st = stats_map.get(r.id, {"total": 0, "confirmed": 0, "refused": 0, "rate": 0})
        results.append(
            RefereeOut(
                id=r.id,
                user_id=r.user_id,
                name=r.name,
                email=r.email,
                phone=r.phone,
                license_number=r.license_number,
                category=r.category or "National Referee",
                is_active=r.is_active,
                matches_count=st["total"],
                assigned_count=st["total"],
                confirmed_count=st["confirmed"],
                refused_count=st["refused"],
                acceptance_rate=st["rate"],
            )
        )
    return results

@router.post("", response_model=RefereeOut, status_code=status.HTTP_201_CREATED)
def create_referee(
    ref_in: RefereeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> RefereeOut:
    email_clean = ref_in.email.strip().lower()
    existing_user = db.query(User).filter(User.email == email_clean).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with email '{email_clean}' already exists",
        )

    license_clean = ref_in.license_number.strip()
    existing_license = db.query(Referee).filter(Referee.license_number == license_clean).first()
    if existing_license:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Referee with license number '{license_clean}' already exists",
        )

    raw_password = ref_in.password or ref_in.temporary_password
    if not raw_password:
        raw_password = secrets.token_urlsafe(9)
    try:
        validate_password_strength(raw_password, min_length=8)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )

    full_name = (ref_in.full_name or ref_in.name or "").strip()
    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Referee name is required",
        )

    normalized_phone = normalize_moroccan_phone(ref_in.phone)
    hashed_pwd = get_password_hash(raw_password)

    user = User(
        email=email_clean,
        name=full_name,
        hashed_password=hashed_pwd,
        role="referee",
        is_active=True,
        password_changed_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()

    referee = Referee(
        user_id=user.id,
        name=full_name,
        email=email_clean,
        phone=normalized_phone,
        license_number=license_clean,
        category="National Referee",
        is_active=True,
    )
    db.add(referee)
    db.commit()
    db.refresh(referee)

    return RefereeOut(
        id=referee.id,
        user_id=referee.user_id,
        name=referee.name,
        email=referee.email,
        phone=referee.phone,
        license_number=referee.license_number,
        category=referee.category,
        is_active=referee.is_active,
        matches_count=0,
        assigned_count=0,
        confirmed_count=0,
        refused_count=0,
        acceptance_rate=0,
    )

@router.get("/{id}", response_model=RefereeDetailOut)
def get_referee(
    id: str,
    year: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> RefereeDetailOut:
    referee = db.query(Referee).filter(Referee.id == id).first()
    if not referee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referee not found",
        )

    stats = get_referee_stats(db, referee.id)

    asg_query = (
        db.query(Assignment)
        .options(
            joinedload(Assignment.match).joinedload(Match.home_team),
            joinedload(Assignment.match).joinedload(Match.away_team),
            joinedload(Assignment.paying_team),
            joinedload(Assignment.receipt),
        )
        .filter(Assignment.referee_id == referee.id)
    )

    if year and isinstance(year, str):
        asg_query = asg_query.join(Match).filter(Match.date.startswith(year))

    assignments = asg_query.all()
    assignments.sort(key=lambda a: (a.match.date if a.match else ""), reverse=True)

    return RefereeDetailOut(
        id=referee.id,
        user_id=referee.user_id,
        name=referee.name,
        email=referee.email,
        phone=referee.phone,
        license_number=referee.license_number,
        category=referee.category or "National Referee",
        is_active=referee.is_active,
        matches_count=stats["total_assigned"],
        assigned_count=stats["total_assigned"],
        confirmed_count=stats["confirmed"],
        refused_count=stats["refused"],
        acceptance_rate=stats["acceptance_rate"],
        history=assignments,
        stats=stats,
    )

@router.put("/{id}", response_model=RefereeDetailOut)
def update_referee(
    id: str,
    ref_in: RefereeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> RefereeDetailOut:
    referee = db.query(Referee).filter(Referee.id == id).first()
    if not referee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referee not found",
        )

    # Email uniqueness check
    if ref_in.email:
        email_clean = ref_in.email.strip().lower()
        if email_clean != referee.email.lower():
            dup_user = db.query(User).filter(User.email == email_clean).first()
            if dup_user and dup_user.id != referee.user_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"User with email '{email_clean}' already exists",
                )
            referee.email = email_clean
            if referee.user:
                referee.user.email = email_clean

    # License uniqueness check
    if ref_in.license_number:
        lic_clean = ref_in.license_number.strip()
        if lic_clean != referee.license_number:
            dup_lic = db.query(Referee).filter(Referee.license_number == lic_clean, Referee.id != id).first()
            if dup_lic:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Referee with license number '{lic_clean}' already exists",
                )
            referee.license_number = lic_clean

    # Name update
    new_name = (ref_in.full_name or ref_in.name)
    if new_name is not None and new_name.strip():
        referee.name = new_name.strip()
        if referee.user:
            referee.user.name = new_name.strip()

    # Phone update
    if ref_in.phone:
        referee.phone = normalize_moroccan_phone(ref_in.phone)

    # Active status update
    if ref_in.is_active is not None:
        referee.is_active = ref_in.is_active
        if referee.user:
            referee.user.is_active = ref_in.is_active

    db.commit()
    db.refresh(referee)

    return get_referee(id, year=None, db=db, current_user=current_user)

@router.post("/{id}/reset-password")
def reset_referee_password(
    id: str,
    reset_in: ResetPasswordInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    referee = db.query(Referee).filter(Referee.id == id).first()
    if not referee or not referee.user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referee or associated user account not found",
        )

    try:
        validate_password_strength(reset_in.password, min_length=8)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )

    user = db.query(User).filter(User.id == referee.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found",
        )

    user.hashed_password = get_password_hash(reset_in.password)
    user.password_changed_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok", "message": "Password reset successfully"}

@router.post("/{id}/deactivate")
def deactivate_referee(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    referee = db.query(Referee).filter(Referee.id == id).first()
    if not referee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referee not found",
        )

    referee.is_active = False
    if referee.user:
        referee.user.is_active = False

    db.commit()
    return {"status": "ok", "message": "Referee deactivated"}

@router.post("/{id}/activate")
def activate_referee(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    referee = db.query(Referee).filter(Referee.id == id).first()
    if not referee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referee not found",
        )

    referee.is_active = True
    if referee.user:
        referee.user.is_active = True

    db.commit()
    return {"status": "ok", "message": "Referee activated"}

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_referee(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    referee = db.query(Referee).filter(Referee.id == id).first()
    if not referee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referee not found",
        )

    asg_count = db.query(Assignment).filter(Assignment.referee_id == id).count()
    if asg_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Referee has assignments, deactivate instead",
        )

    user = referee.user
    db.delete(referee)
    if user:
        db.delete(user)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
