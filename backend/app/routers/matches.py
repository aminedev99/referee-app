from datetime import datetime, date as dt_date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.deps import get_db, require_admin
from app.models import Match, Assignment, Team, Referee, User, Receipt
from app.schemas import MatchOut, MatchCreate, MatchUpdate, AssignmentOut, MatchSummaryOut, RefereeSummaryOut, TeamOut, ReceiptOut
from app.services.notifications import notify

router = APIRouter(prefix="/matches", tags=["matches"], dependencies=[Depends(require_admin)])

def is_needs_attention(match_date: str, match_time: str, asg_status: str, match_status: str = "scheduled") -> bool:
    if asg_status != "pending" or match_status == "cancelled":
        return False
    try:
        match_dt = datetime.strptime(f"{match_date} {match_time}", "%Y-%m-%d %H:%M")
        now = datetime.now()
        diff = (match_dt - now).total_seconds()
        return 0 <= diff <= 24 * 3600
    except Exception:
        return False

def build_assignment_out(a: Assignment, m: Optional[Match] = None) -> AssignmentOut:
    if m is None and hasattr(a, "match") and a.match:
        m = a.match

    needs_attn = is_needs_attention(m.date, m.time, a.status, getattr(m, "status", "scheduled")) if m else False
    receipt_out = None
    if a.receipt:
        receipt_out = ReceiptOut(
            id=a.receipt.id,
            assignment_id=a.id,
            receipt_number=a.receipt.receipt_number,
            number=a.receipt.number or a.receipt.receipt_number,
            issued_at=a.receipt.issued_at,
            amount=a.receipt.amount,
            amount_in_words=a.receipt.amount_in_words,
            pdf_url=f"/api/assignments/{a.id}/receipt.pdf",
        )

    ref_out = None
    if a.referee:
        ref_out = RefereeSummaryOut(
            id=a.referee.id,
            user_id=a.referee.user_id,
            name=a.referee.name,
            email=a.referee.email,
            phone=a.referee.phone,
            license_number=a.referee.license_number,
            gender=getattr(a.referee, "gender", "Homme") or "Homme",
            category=a.referee.category,
            is_active=a.referee.is_active,
        )

    paying_out = None
    if a.paying_team:
        paying_out = TeamOut(
            id=a.paying_team.id,
            name=a.paying_team.name,
            city=a.paying_team.city,
        )

    match_out = None
    if m:
        home_out = TeamOut(id=m.home_team.id, name=m.home_team.name, city=m.home_team.city) if getattr(m, "home_team", None) else None
        away_out = TeamOut(id=m.away_team.id, name=m.away_team.name, city=m.away_team.city) if getattr(m, "away_team", None) else None
        match_out = MatchSummaryOut(
            id=m.id,
            match_number=m.match_number,
            home_team_id=m.home_team_id,
            away_team_id=m.away_team_id,
            home_team=home_out,
            away_team=away_out,
            date=m.date,
            time=m.time,
            city=m.city,
            venue=m.venue,
            division=m.division,
            category=m.category,
            gender=getattr(m, "gender", "Homme") or "Homme",
            status=m.status,
        )

    return AssignmentOut(
        id=a.id,
        match_id=a.match_id,
        match=match_out,
        referee_id=a.referee_id,
        referee=ref_out,
        referee_function=a.referee_function,
        indemnity=a.indemnity,
        indemnity_home=getattr(a, "indemnity_home", None) or a.indemnity,
        indemnity_away=getattr(a, "indemnity_away", None) or a.indemnity,
        paying_team_id=a.paying_team_id or (m.home_team_id if m else None),
        paying_team=paying_out,
        status=a.status,
        refusal_reason=a.refusal_reason,
        receipt=receipt_out,
        last_reminded_at=a.last_reminded_at,
        needs_attention=needs_attn,
        created_at=a.created_at,
    )

def build_match_out(m: Match) -> MatchOut:
    asgs = m.assignments or []
    asgs_out = [build_assignment_out(a, m) for a in asgs]

    return MatchOut(
        id=m.id,
        match_number=m.match_number,
        home_team_id=m.home_team_id,
        away_team_id=m.away_team_id,
        home_team=TeamOut(id=m.home_team.id, name=m.home_team.name, city=m.home_team.city),
        away_team=TeamOut(id=m.away_team.id, name=m.away_team.name, city=m.away_team.city),
        date=m.date,
        time=m.time,
        city=m.city,
        venue=m.venue,
        division=m.division,
        category=m.category,
        gender=getattr(m, "gender", "Homme") or "Homme",
        status=m.status,
        assignments=asgs_out,
        assignments_count=len(asgs),
        confirmed_count=sum(1 for a in asgs if a.status == "confirmed"),
        pending_count=sum(1 for a in asgs if a.status == "pending"),
        refused_count=sum(1 for a in asgs if a.status == "refused"),
    )

def check_referee_conflicts(
    db: Session,
    referee_id: str,
    target_date: str,
    target_time: str,
    exclude_match_id: Optional[str] = None,
) -> None:
    target_dt = datetime.strptime(f"{target_date} {target_time}", "%Y-%m-%d %H:%M")

    query = (
        db.query(Assignment)
        .join(Match)
        .options(joinedload(Assignment.match).joinedload(Match.home_team), joinedload(Assignment.match).joinedload(Match.away_team), joinedload(Assignment.referee))
        .filter(
            Assignment.referee_id == referee_id,
            Match.status != "cancelled",
        )
    )
    if exclude_match_id:
        query = query.filter(Assignment.match_id != exclude_match_id)

    other_asgs = query.all()
    for o in other_asgs:
        m = o.match
        if not m:
            continue
        try:
            other_dt = datetime.strptime(f"{m.date} {m.time}", "%Y-%m-%d %H:%M")
        except Exception:
            continue

        diff_seconds = abs((target_dt - other_dt).total_seconds())
        if diff_seconds <= 3 * 3600:
            ref_name = o.referee.name if o.referee else "Referee"
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"{ref_name} is already assigned to {m.home_team.name} vs {m.away_team.name} at {m.time}",
            )

@router.get("", response_model=List[MatchOut])
def get_matches(
    scope: Optional[str] = Query("all"), # all | upcoming | past | cancelled
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
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

    if scope == "cancelled":
        query = query.filter(Match.status == "cancelled")
    else:
        query = query.filter(Match.status != "cancelled")

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
    return [build_match_out(m) for m in matches]

@router.get("/{id}", response_model=MatchOut)
def get_match(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
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

    return build_match_out(match)

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

    match_date = match_in.date or match_in.match_date
    if not match_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Match date is required",
        )
    match_time = match_in.time or "18:30"

    try:
        target_dt = datetime.strptime(f"{match_date} {match_time}", "%Y-%m-%d %H:%M")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid match date or time format",
        )

    if target_dt <= datetime.now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Match date must be in the future",
        )

    # Validate active referees and run conflict checks
    for asg_in in match_in.assignments:
        base_ind = float(asg_in.indemnity or 0.0)
        ind_home = float(asg_in.indemnity_home) if asg_in.indemnity_home is not None else base_ind
        ind_away = float(asg_in.indemnity_away) if asg_in.indemnity_away is not None else base_ind
        main_ind = base_ind if base_ind > 0 else (ind_home if ind_home > 0 else ind_away)
        if main_ind <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Indemnity must be greater than 0",
            )
        paying_id = asg_in.paying_team_id or match_in.home_team_id
        if paying_id not in (match_in.home_team_id, match_in.away_team_id):
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
        if not ref.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Referee '{ref.name}' is inactive and cannot be assigned",
            )

        check_referee_conflicts(db, ref.id, match_date, match_time)

    match_number = f"2026-{db.query(Match).count() + 10:02d}"

    match = Match(
        match_number=match_number,
        home_team_id=match_in.home_team_id,
        away_team_id=match_in.away_team_id,
        date=match_date,
        time=match_time,
        city=match_in.city.strip(),
        venue=match_in.venue.strip(),
        division=match_in.division,
        category=match_in.category,
        gender=match_in.gender or "Homme",
        status="scheduled",
        created_by_id=current_user.id,
    )
    db.add(match)
    db.flush()

    notify_user_ids: List[str] = []
    for asg_in in match_in.assignments:
        ref = db.query(Referee).filter(Referee.id == asg_in.referee_id).first()
        base_ind = float(asg_in.indemnity or 0.0)
        ind_home = float(asg_in.indemnity_home) if asg_in.indemnity_home is not None else base_ind
        ind_away = float(asg_in.indemnity_away) if asg_in.indemnity_away is not None else base_ind
        main_ind = base_ind if base_ind > 0 else (ind_home if ind_home > 0 else ind_away)
        assignment = Assignment(
            match_id=match.id,
            referee_id=asg_in.referee_id,
            referee_function=asg_in.referee_function,
            indemnity=main_ind,
            indemnity_home=ind_home,
            indemnity_away=ind_away,
            paying_team_id=asg_in.paying_team_id or match_in.home_team_id,
            status="pending",
        )
        db.add(assignment)
        if ref and ref.user_id:
            notify_user_ids.append(ref.user_id)

    # One notification per referee
    notif_msg = f"Nouvelle désignation : {home_team.name} vs {away_team.name}, le {match_date}"
    notify(db, notify_user_ids, notif_msg, type="assignment", title="Nouvelle désignation")

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

    if match.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot edit a cancelled match",
        )

    # Past match check
    try:
        match_dt = datetime.strptime(f"{match.date} {match.time}", "%Y-%m-%d %H:%M")
        if match_dt < datetime.now():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot edit past matches",
            )
    except ValueError:
        pass

    home_id = match_in.home_team_id or match.home_team_id
    away_id = match_in.away_team_id or match.away_team_id
    if home_id == away_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Away team must differ from home team",
        )

    # Detect venue, date, city changes
    new_date = match_in.date or match_in.match_date or match.date
    new_time = match_in.time or match.time
    new_venue = match_in.venue or match.venue
    new_city = match_in.city or match.city

    date_or_place_changed = (
        new_date != match.date or
        new_venue != match.venue or
        new_city != match.city
    )

    match.date = new_date
    match.time = new_time
    match.venue = new_venue
    match.city = new_city
    if match_in.division:
        match.division = match_in.division
    if match_in.category:
        match.category = match_in.category
    if match_in.gender:
        match.gender = match_in.gender
    if match_in.home_team_id:
        match.home_team_id = match_in.home_team_id
    if match_in.away_team_id:
        match.away_team_id = match_in.away_team_id

    # If date or place changed, reset every confirmed/refused assignment to pending and notify
    if date_or_place_changed:
        existing_asgs = db.query(Assignment).filter(Assignment.match_id == id).all()
        referees_to_renotify = []
        for asg in existing_asgs:
            if asg.status in ("confirmed", "refused"):
                asg.status = "pending"
                asg.refusal_reason = None
                if asg.referee and asg.referee.user_id:
                    referees_to_renotify.append(asg.referee.user_id)
        if referees_to_renotify:
            notify(
                db,
                referees_to_renotify,
                "Le match a été modifié, veuillez confirmer à nouveau votre disponibilité",
                type="assignment",
                title="Match modifié",
            )

    # Sync assignments if provided
    if match_in.assignments is not None:
        new_ref_ids = [a.referee_id for a in match_in.assignments]
        if len(new_ref_ids) != len(set(new_ref_ids)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate referee in assignments is not allowed",
            )

        existing_asgs = db.query(Assignment).options(joinedload(Assignment.receipt), joinedload(Assignment.referee)).filter(Assignment.match_id == id).all()
        existing_by_ref = {a.referee_id: a for a in existing_asgs}

        # Removing a referee: delete assignment and notify "Assignment cancelled: {home} vs {away}".
        # Blocked with 409 if it has a receipt.
        for existing in existing_asgs:
            if existing.referee_id not in new_ref_ids:
                if existing.receipt is not None:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Cannot remove assignment that already has an issued receipt",
                    )
                if existing.referee and existing.referee.user_id:
                    notify(
                        db,
                        existing.referee.user_id,
                        f"Désignation annulée : {match.home_team.name} vs {match.away_team.name}",
                        type="assignment",
                        title="Désignation annulée",
                    )
                db.delete(existing)

        # Add or update assignments
        for asg_in in match_in.assignments:
            base_ind = float(asg_in.indemnity or 0.0)
            ind_home = float(asg_in.indemnity_home) if asg_in.indemnity_home is not None else base_ind
            ind_away = float(asg_in.indemnity_away) if asg_in.indemnity_away is not None else base_ind
            main_ind = base_ind if base_ind > 0 else (ind_home if ind_home > 0 else ind_away)
            if main_ind <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Indemnity must be greater than 0",
                )
            paying_id = asg_in.paying_team_id or home_id
            if paying_id not in (home_id, away_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Paying team must be either home or away team",
                )

            if asg_in.referee_id in existing_by_ref:
                existing = existing_by_ref[asg_in.referee_id]
                changed_fn = existing.referee_function != asg_in.referee_function
                changed_ind = (
                    float(existing.indemnity) != main_ind or
                    float(getattr(existing, "indemnity_home", 0.0) or 0.0) != ind_home or
                    float(getattr(existing, "indemnity_away", 0.0) or 0.0) != ind_away
                )
                if changed_fn or changed_ind:
                    # Changing an indemnity or function resets that assignment to pending and notifies. Blocked with 409 if receipt exists.
                    if existing.receipt is not None:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail="Cannot change function or indemnity for an assignment with an issued receipt",
                        )
                    existing.referee_function = asg_in.referee_function
                    existing.indemnity = main_ind
                    existing.indemnity_home = ind_home
                    existing.indemnity_away = ind_away
                    existing.status = "pending"
                    existing.refusal_reason = None
                    if existing.referee and existing.referee.user_id:
                        notify(
                            db,
                            existing.referee.user_id,
                            f"Désignation modifiée : {match.home_team.name} vs {match.away_team.name}, veuillez confirmer à nouveau",
                            type="assignment",
                            title="Désignation modifiée",
                        )
                existing.paying_team_id = paying_id
            else:
                ref = db.query(Referee).filter(Referee.id == asg_in.referee_id).first()
                if not ref:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Referee '{asg_in.referee_id}' does not exist",
                    )
                if not ref.is_active:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Referee '{ref.name}' is inactive and cannot be assigned",
                    )
                check_referee_conflicts(db, ref.id, match.date, match.time, exclude_match_id=id)

                new_asg = Assignment(
                    match_id=id,
                    referee_id=ref.id,
                    referee_function=asg_in.referee_function,
                    indemnity=main_ind,
                    indemnity_home=ind_home,
                    indemnity_away=ind_away,
                    paying_team_id=paying_id,
                    status="pending",
                )
                db.add(new_asg)
                if ref.user_id:
                    notify(
                        db,
                        ref.user_id,
                        f"Nouvelle désignation : {match.home_team.name} vs {match.away_team.name}, le {match.date}",
                        type="assignment",
                        title="Nouvelle désignation",
                    )

    db.commit()
    return get_match(match.id, db=db, current_user=current_user)

@router.post("/{id}/cancel")
def cancel_match(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    match = db.query(Match).options(joinedload(Match.assignments).joinedload(Assignment.referee), joinedload(Match.home_team), joinedload(Match.away_team)).filter(Match.id == id).first()
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found",
        )

    match.status = "cancelled"

    ref_user_ids = [
        a.referee.user_id
        for a in (match.assignments or [])
        if a.referee and a.referee.user_id
    ]

    notif_msg = f"Match annulé : {match.home_team.name} vs {match.away_team.name}"
    notify(db, ref_user_ids, notif_msg, type="assignment", title="Match annulé")

    db.commit()
    return {"status": "ok", "message": "Match annulé"}
