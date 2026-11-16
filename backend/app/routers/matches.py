from datetime import date as dt_date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.deps import get_db, require_admin, get_current_user
from app.models import Match, Assignment, Team, Referee, User
from app.schemas import MatchOut, MatchCreate, MatchUpdate
from app.services.notifications import notify

router = APIRouter(prefix="/matches", tags=["matches"])

@router.get("", response_model=List[MatchOut])
def get_matches(
    scope: Optional[str] = Query("all"), # all | upcoming | past
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[MatchOut]:
    query = (
        db.query(Match)
        .options(
            joinedload(Match.home_team),
            joinedload(Match.away_team),
            joinedload(Match.assignments).joinedload(Assignment.referee),
            joinedload(Match.assignments).joinedload(Assignment.paying_team),
            joinedload(Match.assignments).joinedload(Assignment.receipt),
        )
    )

    if q and q.strip():
        search = f"%{q.strip()}%"
        query = query.join(Match.home_team).join(Match.away_team).filter(
            or_(
                Team.name.ilike(search),
                Match.city.ilike(search),
                Match.venue.ilike(search),
            )
        )

    today_str = dt_date.today().isoformat()
    if scope == "upcoming":
        query = query.filter(Match.date >= today_str).order_by(Match.date.asc(), Match.time.asc())
    elif scope == "past":
        query = query.filter(Match.date < today_str).order_by(Match.date.desc(), Match.time.desc())
    else:
        query = query.order_by(Match.date.desc(), Match.time.desc())

    matches = query.all()

    results: List[MatchOut] = []
    for m in matches:
        asgs = m.assignments or []
        m_out = MatchOut(
            id=m.id,
            match_number=m.match_number,
            home_team_id=m.home_team_id,
            away_team_id=m.away_team_id,
            home_team=m.home_team,
            away_team=m.away_team,
            date=m.date,
            time=m.time,
            city=m.city,
            venue=m.venue,
            division=m.division,
            category=m.category,
            assignments=asgs,
            assignments_count=len(asgs),
            confirmed_count=sum(1 for a in asgs if a.status == "confirmed"),
            pending_count=sum(1 for a in asgs if a.status == "pending"),
            refused_count=sum(1 for a in asgs if a.status == "refused"),
        )
        results.append(m_out)

    return results

@router.get("/{id}", response_model=MatchOut)
def get_match(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MatchOut:
    match = (
        db.query(Match)
        .options(
            joinedload(Match.home_team),
            joinedload(Match.away_team),
            joinedload(Match.assignments).joinedload(Assignment.referee),
            joinedload(Match.assignments).joinedload(Assignment.paying_team),
            joinedload(Match.assignments).joinedload(Assignment.receipt),
        )
        .filter(Match.id == id)
        .first()
    )
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found",
        )

    asgs = match.assignments or []
    return MatchOut(
        id=match.id,
        match_number=match.match_number,
        home_team_id=match.home_team_id,
        away_team_id=match.away_team_id,
        home_team=match.home_team,
        away_team=match.away_team,
        date=match.date,
        time=match.time,
        city=match.city,
        venue=match.venue,
        division=match.division,
        category=match.category,
        assignments=asgs,
        assignments_count=len(asgs),
        confirmed_count=sum(1 for a in asgs if a.status == "confirmed"),
        pending_count=sum(1 for a in asgs if a.status == "pending"),
        refused_count=sum(1 for a in asgs if a.status == "refused"),
    )

@router.post("", response_model=MatchOut, status_code=status.HTTP_201_CREATED)
def create_match(
    match_in: MatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> MatchOut:
    if match_in.home_team_id == match_in.away_team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Away team must differ from home team",
        )

    if not match_in.assignments or len(match_in.assignments) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one referee assignment is required",
        )

    ref_ids = [a.referee_id for a in match_in.assignments]
    if len(ref_ids) != len(set(ref_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate referee in assignments is not allowed",
        )

    home_team = db.query(Team).filter(Team.id == match_in.home_team_id).first()
    away_team = db.query(Team).filter(Team.id == match_in.away_team_id).first()
    if not home_team or not away_team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid home or away team ID",
        )

    match_date = match_in.date or match_in.match_date or dt_date.today().isoformat()
    match_number = f"2026-{db.query(Match).count() + 10:02d}"

    match = Match(
        match_number=match_number,
        home_team_id=match_in.home_team_id,
        away_team_id=match_in.away_team_id,
        date=match_date,
        time=match_in.time or "18:30",
        city=match_in.city.strip(),
        venue=match_in.venue.strip(),
        division=match_in.division,
        category=match_in.category,
        created_by_id=current_user.id,
    )
    db.add(match)
    db.flush()

    assignments_to_create: List[Assignment] = []
    notify_user_ids: List[str] = []

    for asg_in in match_in.assignments:
        if asg_in.indemnity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Indemnity must be greater than 0",
            )
        if asg_in.paying_team_id not in (match_in.home_team_id, match_in.away_team_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Paying team must be either home or away team",
            )

        ref = db.query(Referee).filter(Referee.id == asg_in.referee_id).first()
        if not ref:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Referee '{asg_in.referee_id}' does not exist",
            )

        assignment = Assignment(
            match_id=match.id,
            referee_id=ref.id,
            referee_function=asg_in.referee_function,
            indemnity=float(asg_in.indemnity),
            paying_team_id=asg_in.paying_team_id,
            status="pending",
        )
        db.add(assignment)
        assignments_to_create.append(assignment)

        if ref.user_id:
            notify_user_ids.append(ref.user_id)

    # Send notification to each referee
    notif_msg = f"New assignment: {home_team.name} vs {away_team.name}, {match_date}"
    notify(db, notify_user_ids, notif_msg, type="assignment", title="New assignment")

    db.commit()

    return get_match(match.id, db=db, current_user=current_user)

@router.put("/{id}", response_model=MatchOut)
def update_match(
    id: str,
    match_in: MatchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> MatchOut:
    match = db.query(Match).filter(Match.id == id).first()
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found",
        )

    home_id = match_in.home_team_id or match.home_team_id
    away_id = match_in.away_team_id or match.away_team_id
    if home_id == away_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Away team must differ from home team",
        )

    date_changed = False
    new_date = match_in.date or match_in.match_date
    if new_date and new_date != match.date:
        match.date = new_date
        date_changed = True

    if match_in.time:
        match.time = match_in.time
    if match_in.city:
        match.city = match_in.city
    if match_in.venue:
        match.venue = match_in.venue
    if match_in.division:
        match.division = match_in.division
    if match_in.category:
        match.category = match_in.category
    if match_in.home_team_id:
        match.home_team_id = match_in.home_team_id
    if match_in.away_team_id:
        match.away_team_id = match_in.away_team_id

    # If assignments are provided, sync them
    if match_in.assignments is not None:
        new_ref_ids = [a.referee_id for a in match_in.assignments]
        if len(new_ref_ids) != len(set(new_ref_ids)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate referee in assignments is not allowed",
            )

        existing_asgs = db.query(Assignment).filter(Assignment.match_id == id).all()
        existing_by_ref = {a.referee_id: a for a in existing_asgs}

        # Check if removing an assignment that has a receipt
        for existing in existing_asgs:
            if existing.referee_id not in new_ref_ids:
                if existing.receipt is not None:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Cannot remove assignment that already has an issued receipt",
                    )
                db.delete(existing)

        # Add or update
        for asg_in in match_in.assignments:
            if asg_in.indemnity <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Indemnity must be greater than 0",
                )
            if asg_in.paying_team_id not in (home_id, away_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Paying team must be either home or away team",
                )

            if asg_in.referee_id in existing_by_ref:
                existing = existing_by_ref[asg_in.referee_id]
                existing.referee_function = asg_in.referee_function
                existing.indemnity = float(asg_in.indemnity)
                existing.paying_team_id = asg_in.paying_team_id
            else:
                ref = db.query(Referee).filter(Referee.id == asg_in.referee_id).first()
                if not ref:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Referee '{asg_in.referee_id}' does not exist",
                    )
                new_asg = Assignment(
                    match_id=id,
                    referee_id=ref.id,
                    referee_function=asg_in.referee_function,
                    indemnity=float(asg_in.indemnity),
                    paying_team_id=asg_in.paying_team_id,
                    status="pending",
                )
                db.add(new_asg)
                if ref.user_id:
                    notify(
                        db,
                        ref.user_id,
                        f"New assignment: {match.home_team.name} vs {match.away_team.name}, {match.date}",
                        type="assignment",
                    )

    db.commit()
    return get_match(match.id, db=db, current_user=current_user)
