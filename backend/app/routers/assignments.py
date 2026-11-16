from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from app.deps import get_db, require_admin
from app.models import Assignment, Match, User
from app.schemas import AssignmentOut

router = APIRouter(prefix="/assignments", tags=["assignments"])

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
    return assignments
