from datetime import datetime
from typing import Optional, List, Any, Union
from pydantic import BaseModel, ConfigDict, Field, field_serializer

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class TeamBase(BaseSchema):
    name: str
    city: str

class TeamCreate(TeamBase):
    pass

class TeamUpdate(BaseSchema):
    name: Optional[str] = None
    city: Optional[str] = None

class TeamOut(TeamBase):
    id: str

class UserOut(BaseSchema):
    id: str
    email: str
    name: str
    role: str
    referee_id: Optional[str] = None

class LoginResponse(BaseSchema):
    access_token: str
    token_type: str = "bearer"
    role: str
    user: UserOut

class RefereeSummaryOut(BaseSchema):
    id: str
    user_id: Optional[str] = None
    name: str
    email: str
    phone: str
    license_number: str
    category: Optional[str] = "National Referee"

class RefereeOut(RefereeSummaryOut):
    matches_count: int = 0
    acceptance_rate: int = 0
    assigned_count: Optional[int] = 0
    confirmed_count: Optional[int] = 0
    refused_count: Optional[int] = 0

class RefereeCreate(BaseSchema):
    name: Optional[str] = None
    full_name: Optional[str] = None
    email: str
    phone: str
    license_number: str
    password: Optional[str] = None
    temporary_password: Optional[str] = None

class ReceiptOut(BaseSchema):
    id: str
    assignment_id: str
    receipt_number: str
    issued_at: str
    amount: float
    amount_in_words: Optional[str] = None
    pdf_url: Optional[str] = None

class MatchSummaryOut(BaseSchema):
    id: str
    match_number: Optional[str] = None
    home_team_id: str
    away_team_id: str
    home_team: TeamOut
    away_team: TeamOut
    date: str
    time: str
    city: str
    venue: str
    division: str
    category: str

class AssignmentOut(BaseSchema):
    id: str
    match_id: str
    match: Optional[MatchSummaryOut] = None
    referee_id: str
    referee: Optional[RefereeSummaryOut] = None
    referee_function: str
    indemnity: float
    paying_team_id: str
    paying_team: Optional[TeamOut] = None
    status: str
    refusal_reason: Optional[str] = None
    receipt: Optional[ReceiptOut] = None
    created_at: Optional[Union[str, datetime]] = None

    @field_serializer("created_at")
    def serialize_created_at(self, dt: Optional[Union[str, datetime]], _info) -> Optional[str]:
        if isinstance(dt, datetime):
            return dt.isoformat()
        return dt

class AssignmentCreate(BaseSchema):
    referee_id: str
    referee_function: str
    indemnity: float
    paying_team_id: str

class MatchCreate(BaseSchema):
    home_team_id: str
    away_team_id: str
    date: Optional[str] = None
    match_date: Optional[str] = None
    time: Optional[str] = "18:30"
    city: str
    venue: str
    division: str # "1DV" | "2DV"
    category: str # "Men" | "Women" (or "men" | "women")
    assignments: List[AssignmentCreate]

class MatchUpdate(BaseSchema):
    home_team_id: Optional[str] = None
    away_team_id: Optional[str] = None
    date: Optional[str] = None
    match_date: Optional[str] = None
    time: Optional[str] = None
    city: Optional[str] = None
    venue: Optional[str] = None
    division: Optional[str] = None
    category: Optional[str] = None
    assignments: Optional[List[AssignmentCreate]] = None

class MatchOut(MatchSummaryOut):
    assignments: List[AssignmentOut] = []
    assignments_count: Optional[int] = None
    confirmed_count: Optional[int] = None
    pending_count: Optional[int] = None
    refused_count: Optional[int] = None

class RefuseInput(BaseSchema):
    reason: Optional[str] = None

class NotificationOut(BaseSchema):
    id: str
    user_id: Optional[str] = None
    title: str
    description: str
    read: bool
    type: Optional[str] = None
    created_at: Optional[Union[str, datetime]] = None

    @field_serializer("created_at")
    def serialize_created_at(self, dt: Optional[Union[str, datetime]], _info) -> Optional[str]:
        if isinstance(dt, datetime):
            return dt.isoformat()
        return dt

class PastMatchItem(BaseSchema):
    id: str
    home_team: str
    away_team: str
    date: str
    division: str
    status: str
    indemnity: float

class RefereeStatsOut(BaseSchema):
    total_assigned: int
    confirmed: int
    refused: int
    acceptance_rate: int
    past_matches: List[PastMatchItem] = []

class AdminStatsOut(BaseSchema):
    upcoming_matches: int
    pending_responses: int
    refused_this_month: int

class RefereeDetailOut(RefereeOut):
    history: List[AssignmentOut] = []
    stats: Optional[RefereeStatsOut] = None
