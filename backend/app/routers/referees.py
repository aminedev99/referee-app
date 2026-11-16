from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.deps import get_db, require_admin, get_current_user
from app.models import Referee, User, Assignment, Match
from app.schemas import RefereeOut, RefereeCreate, RefereeDetailOut, AssignmentOut
from app.security import get_password_hash
from app.services.stats import get_referees_stats_map, get_referee_stats

router = APIRouter(prefix="/referees", tags=["referees"])

@router.get("", response_model=List[RefereeOut])
def get_referees(
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[RefereeOut]:
    query = db.query(Referee)
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

    raw_password = ref_in.password or ref_in.temporary_password or "Referee12345!"
    hashed_pwd = get_password_hash(raw_password)
    full_name = (ref_in.name or ref_in.full_name or "").strip()
    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Referee name is required",
        )

    user = User(
        email=email_clean,
        name=full_name,
        hashed_password=hashed_pwd,
        role="referee",
    )
    db.add(user)
    db.flush()

    referee = Referee(
        user_id=user.id,
        name=full_name,
        email=email_clean,
        phone=ref_in.phone.strip(),
        license_number=ref_in.license_number.strip(),
        category="National Referee",
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
    current_user: User = Depends(get_current_user),
) -> RefereeDetailOut:
    referee = db.query(Referee).filter(Referee.id == id).first()
    if not referee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referee not found",
        )

    stats = get_referee_stats(db, referee.id)

    # Get history of assignments
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

    if year:
        asg_query = asg_query.join(Match).filter(Match.date.startswith(year))

    assignments = asg_query.all()
    # Sort by match date desc
    assignments.sort(key=lambda a: (a.match.date if a.match else ""), reverse=True)

    return RefereeDetailOut(
        id=referee.id,
        user_id=referee.user_id,
        name=referee.name,
        email=referee.email,
        phone=referee.phone,
        license_number=referee.license_number,
        category=referee.category or "National Referee",
        matches_count=stats["total_assigned"],
        assigned_count=stats["total_assigned"],
        confirmed_count=stats["confirmed"],
        refused_count=stats["refused"],
        acceptance_rate=stats["acceptance_rate"],
        history=assignments,
        stats=stats,
    )
