from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session, joinedload
from app.deps import get_db, require_admin
from app.models import Assignment, Match, User
from app.schemas import AssignmentOut
from app.routers.matches import build_assignment_out
from app.services.notifications import notify

router = APIRouter(prefix="/assignments", tags=["assignments"], dependencies=[Depends(require_admin)])

@router.get("", response_model=List[AssignmentOut])
def get_assignments(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> List[AssignmentOut]:
    query = (
        db.query(Assignment)
        .options(
            joinedload(Assignment.match).joinedload(Match.home_team),
            joinedload(Assignment.match).joinedload(Match.away_team),
            joinedload(Assignment.referee),
            joinedload(Assignment.paying_team),
            joinedload(Assignment.receipt),
        )
    )

    if status and status != "all":
        query = query.filter(Assignment.status == status)

    assignments = query.order_by(Assignment.created_at.desc()).all()
    return [build_assignment_out(a, a.match) for a in assignments if a.match]

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    assignment = (
        db.query(Assignment)
        .options(
            joinedload(Assignment.receipt),
            joinedload(Assignment.referee),
            joinedload(Assignment.match).joinedload(Match.home_team),
            joinedload(Assignment.match).joinedload(Match.away_team),
        )
        .filter(Assignment.id == id)
        .first()
    )
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    if assignment.receipt is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete assignment that has an issued receipt",
        )

    if assignment.referee and assignment.referee.user_id:
        m = assignment.match
        match_str = f"{m.home_team.name} vs {m.away_team.name}" if m else "Match"
        notify(
            db,
            assignment.referee.user_id,
            f"Désignation annulée : {match_str}",
            type="assignment",
            title=f"Désignation annulée : {match_str}",
        )

    db.delete(assignment)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post("/{id}/remind")
def remind_assignment(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    assignment = (
        db.query(Assignment)
        .options(
            joinedload(Assignment.referee),
            joinedload(Assignment.match).joinedload(Match.home_team),
            joinedload(Assignment.match).joinedload(Match.away_team),
        )
        .filter(Assignment.id == id)
        .first()
    )
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    if assignment.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le rappel ne peut être envoyé que pour les désignations en attente",
        )

    now = datetime.now(timezone.utc)
    if assignment.last_reminded_at:
        diff_hours = (now - assignment.last_reminded_at).total_seconds() / 3600.0
        if diff_hours < 12.0:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rappel déjà envoyé dans les 12 dernières heures. Veuillez patienter.",
            )

    assignment.last_reminded_at = now
    if assignment.referee and assignment.referee.user_id:
        m = assignment.match
        match_str = f"{m.home_team.name} vs {m.away_team.name}" if m else "Match"
        notify(
            db,
            assignment.referee.user_id,
            f"Rappel : merci de répondre à votre désignation pour {match_str}",
            type="assignment",
            title=f"Rappel de désignation : {match_str}",
        )

    db.commit()
    return {"status": "ok", "message": "Rappel envoyé avec succès"}
