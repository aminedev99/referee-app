from datetime import datetime, date as dt_date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from app.deps import get_db, require_referee
from app.models import Assignment, Referee, Match, User
from app.schemas import AssignmentOut, RefuseInput, RefereeStatsOut, RefereeOut
from app.services.notifications import notify
from app.services.stats import get_referee_stats
from app.routers.matches import build_assignment_out

router = APIRouter(prefix="/me", tags=["me"], dependencies=[Depends(require_referee)])

def _get_current_referee(user: User, db: Session) -> Referee:
    referee = db.query(Referee).filter(Referee.user_id == user.id).first()
    if not referee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referee profile not found for this user",
        )
    return referee

@router.get("/assignments", response_model=List[AssignmentOut])
def get_my_assignments(
    tab: Optional[str] = Query(None), # respond | confirmed | past
    db: Session = Depends(get_db),
    current_user: User = Depends(require_referee),
) -> List[AssignmentOut]:
    referee = _get_current_referee(current_user, db)

    query = (
        db.query(Assignment)
        .options(
            joinedload(Assignment.match).joinedload(Match.home_team),
            joinedload(Assignment.match).joinedload(Match.away_team),
            joinedload(Assignment.referee),
            joinedload(Assignment.paying_team),
            joinedload(Assignment.receipt),
        )
        .filter(Assignment.referee_id == referee.id)
    )

    today_str = dt_date.today().isoformat()
    if tab == "respond":
        query = query.filter(Assignment.status == "pending")
    elif tab == "confirmed":
        query = query.join(Assignment.match).filter(
            Assignment.status == "confirmed",
            Match.date >= today_str,
        )
    elif tab == "past":
        query = query.join(Assignment.match).filter(
            Match.date < today_str,
        )

    assignments = query.order_by(Assignment.created_at.desc()).all()
    return [build_assignment_out(a, a.match) for a in assignments if a.match]

@router.get("/assignments/{id}", response_model=AssignmentOut)
def get_my_assignment(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_referee),
) -> AssignmentOut:
    referee = _get_current_referee(current_user, db)

    assignment = (
        db.query(Assignment)
        .options(
            joinedload(Assignment.match).joinedload(Match.home_team),
            joinedload(Assignment.match).joinedload(Match.away_team),
            joinedload(Assignment.referee),
            joinedload(Assignment.paying_team),
            joinedload(Assignment.receipt),
        )
        .filter(
            Assignment.id == id,
            Assignment.referee_id == referee.id,
        )
        .first()
    )
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )
    return build_assignment_out(assignment, assignment.match)

@router.post("/assignments/{id}/confirm", response_model=AssignmentOut)
def confirm_my_assignment(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_referee),
) -> AssignmentOut:
    referee = _get_current_referee(current_user, db)

    assignment = (
        db.query(Assignment)
        .options(
            joinedload(Assignment.match).joinedload(Match.home_team),
            joinedload(Assignment.match).joinedload(Match.away_team),
            joinedload(Assignment.referee),
            joinedload(Assignment.paying_team),
            joinedload(Assignment.receipt),
        )
        .filter(
            Assignment.id == id,
            Assignment.referee_id == referee.id,
        )
        .first()
    )
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    match = assignment.match
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated match not found",
        )

    # Cancelled matches cannot be answered
    if match.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot answer an assignment for a cancelled match",
        )

    # Check match datetime
    try:
        match_dt = datetime.strptime(f"{match.date} {match.time}", "%Y-%m-%d %H:%M")
        now = datetime.now()
        time_until_match = (match_dt - now).total_seconds()
        if time_until_match <= 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot answer an assignment for a past match",
            )
    except ValueError:
        time_until_match = 86400 * 10

    # Same status requested again returns 409
    if assignment.status == "confirmed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Assignment is already confirmed",
        )

    # If transitioning from refused -> confirmed, allowed only until 24h before match
    if assignment.status == "refused":
        if time_until_match < 24 * 3600:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Too close to the match, contact the administration",
            )

    assignment.status = "confirmed"
    assignment.refusal_reason = None

    # Notify all admins
    admins = db.query(User).filter(User.role == "admin").all()
    admin_ids = [a.id for a in admins]
    match_str = f"{match.home_team.name} vs {match.away_team.name}"
    notif_msg = f"{referee.name} a confirmé sa désignation pour {match_str}"
    notify(db, admin_ids, notif_msg, type="confirmation", title=f"{referee.name} a confirmé")

    db.commit()
    db.refresh(assignment)
    return build_assignment_out(assignment, match)

@router.post("/assignments/{id}/refuse", response_model=AssignmentOut)
def refuse_my_assignment(
    id: str,
    refuse_in: Optional[RefuseInput] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_referee),
) -> AssignmentOut:
    referee = _get_current_referee(current_user, db)

    assignment = (
        db.query(Assignment)
        .options(
            joinedload(Assignment.match).joinedload(Match.home_team),
            joinedload(Assignment.match).joinedload(Match.away_team),
            joinedload(Assignment.referee),
            joinedload(Assignment.paying_team),
            joinedload(Assignment.receipt),
        )
        .filter(
            Assignment.id == id,
            Assignment.referee_id == referee.id,
        )
        .first()
    )
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    match = assignment.match
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated match not found",
        )

    # Cancelled matches cannot be answered
    if match.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot answer an assignment for a cancelled match",
        )

    # Check match datetime
    try:
        match_dt = datetime.strptime(f"{match.date} {match.time}", "%Y-%m-%d %H:%M")
        now = datetime.now()
        time_until_match = (match_dt - now).total_seconds()
        if time_until_match <= 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot answer an assignment for a past match",
            )
    except ValueError:
        time_until_match = 86400 * 10

    # Same status requested again returns 409
    if assignment.status == "refused":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Assignment is already refused",
        )

    # If transitioning from confirmed -> refused, allowed only until 24h before match
    if assignment.status == "confirmed":
        if time_until_match < 24 * 3600:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Too close to the match, contact the administration",
            )

    reason = refuse_in.reason if refuse_in and refuse_in.reason else "Unavailable"
    assignment.status = "refused"
    assignment.refusal_reason = reason

    # Notify all admins
    admins = db.query(User).filter(User.role == "admin").all()
    admin_ids = [a.id for a in admins]
    match_str = f"{match.home_team.name} vs {match.away_team.name}"
    notif_msg = f"{referee.name} a refusé sa désignation pour {match_str}"
    notify(db, admin_ids, notif_msg, type="refusal", title=f"{referee.name} a refusé")

    db.commit()
    db.refresh(assignment)
    return build_assignment_out(assignment, match)

@router.get("/stats", response_model=RefereeStatsOut)
def get_my_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_referee),
) -> RefereeStatsOut:
    referee = _get_current_referee(current_user, db)
    stats = get_referee_stats(db, referee.id)
    return stats

@router.get("/profile", response_model=RefereeOut)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_referee),
) -> RefereeOut:
    referee = _get_current_referee(current_user, db)
    stats = get_referee_stats(db, referee.id)
    return RefereeOut(
        id=referee.id,
        user_id=referee.user_id,
        name=referee.name,
        email=referee.email,
        phone=referee.phone,
        license_number=referee.license_number,
        gender=getattr(referee, "gender", "Homme") or "Homme",
        category=referee.category or "National Referee",
        is_active=referee.is_active,
        matches_count=stats["total_assigned"],
        assigned_count=stats["total_assigned"],
        confirmed_count=stats["confirmed"],
        refused_count=stats["refused"],
        acceptance_rate=stats["acceptance_rate"],
    )
