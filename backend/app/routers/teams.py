from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.deps import get_db, require_admin, get_current_user
from app.models import Team, User
from app.schemas import TeamOut, TeamCreate, TeamUpdate

router = APIRouter(prefix="/teams", tags=["teams"])

@router.get("", response_model=List[TeamOut])
def get_teams(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[TeamOut]:
    teams = db.query(Team).order_by(Team.name.asc()).all()
    return teams

@router.post("", response_model=TeamOut, status_code=status.HTTP_201_CREATED)
def create_team(
    team_in: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> TeamOut:
    existing = db.query(Team).filter(Team.name.ilike(team_in.name.strip())).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Team with name '{team_in.name}' already exists",
        )
    team = Team(name=team_in.name.strip(), city=team_in.city.strip())
    db.add(team)
    db.commit()
    db.refresh(team)
    return team

@router.put("/{id}", response_model=TeamOut)
def update_team(
    id: str,
    team_in: TeamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> TeamOut:
    team = db.query(Team).filter(Team.id == id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )

    if team_in.name and team_in.name.strip().lower() != team.name.lower():
        existing = db.query(Team).filter(Team.name.ilike(team_in.name.strip())).first()
        if existing and existing.id != id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Team with name '{team_in.name}' already exists",
            )
        team.name = team_in.name.strip()

    if team_in.city:
        team.city = team_in.city.strip()

    db.commit()
    db.refresh(team)
    return team
