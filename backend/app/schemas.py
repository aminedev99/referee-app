import re
from datetime import datetime
from typing import Optional, List, Any, Union, Literal
from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def clean_and_validate_email(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    val = v.strip().lower()
    if not EMAIL_REGEX.match(val):
        raise ValueError("Format d'adresse email invalide")
    return val

class BaseOutSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class BaseInSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

# ----------------- TEAMS -----------------

class TeamCreate(BaseInSchema):
    name: str = Field(..., min_length=1, max_length=100)
    city: str = Field(..., min_length=1, max_length=100)

class TeamUpdate(BaseInSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    city: Optional[str] = Field(None, min_length=1, max_length=100)

class TeamOut(BaseOutSchema):
    id: str
    name: str
    city: str

# ----------------- USERS & AUTH -----------------

class UserOut(BaseOutSchema):
    id: str
    email: str
    name: str
    role: str
    is_active: bool = True
    referee_id: Optional[str] = None
    phone: Optional[str] = None

class UserUpdate(BaseInSchema):
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, min_length=6, max_length=30)

class ChangePasswordInput(BaseInSchema):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)

class ResetPasswordInput(BaseInSchema):
    password: str = Field(..., min_length=8, max_length=128)

class LoginResponse(BaseOutSchema):
    access_token: str
    token_type: str = "bearer"
    role: str
    user: UserOut

# ----------------- REFEREES -----------------

class RefereeSummaryOut(BaseOutSchema):
    id: str
    user_id: Optional[str] = None
    name: str
    email: str
    phone: str
    license_number: str
    gender: str = "Homme"
    category: Optional[str] = "National Referee"
    is_active: bool = True

class RefereeOut(RefereeSummaryOut):
    matches_count: int = 0
    acceptance_rate: int = 0
    assigned_count: Optional[int] = 0
    confirmed_count: Optional[int] = 0
    refused_count: Optional[int] = 0

class RefereeCreate(BaseInSchema):
    full_name: Optional[str] = Field(None, max_length=100)
    name: Optional[str] = Field(None, max_length=100)
    email: str = Field(..., max_length=255)
    phone: str = Field(..., min_length=6, max_length=30)
    license_number: str = Field(..., min_length=1, max_length=50)
    gender: Optional[str] = Field("Homme", pattern="^(Homme|Femme)$")
    password: Optional[str] = Field(None, min_length=8, max_length=128)
    temporary_password: Optional[str] = Field(None, min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        res = clean_and_validate_email(v)
        assert res is not None
        return res

class RefereeUpdate(BaseInSchema):
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, min_length=6, max_length=30)
    license_number: Optional[str] = Field(None, min_length=1, max_length=50)
    gender: Optional[str] = Field(None, pattern="^(Homme|Femme)$")
    is_active: Optional[bool] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        return clean_and_validate_email(v)

# ----------------- RECEIPTS -----------------

class ReceiptOut(BaseOutSchema):
    id: str
    assignment_id: str
    receipt_number: str
    number: Optional[str] = None
    issued_at: str
    amount: float
    amount_in_words: Optional[str] = None
    pdf_url: Optional[str] = None

# ----------------- ASSIGNMENTS -----------------

VALID_DIVISIONS = {"1DV", "2DV", "3DV"}
VALID_CATEGORIES = {
    "Seniors", "U19", "U16", "U14", "U12", "U10", "U8",
    "Men", "Women", "Hommes", "Femmes",
}
VALID_FUNCTIONS = {
    "1 er arbitre", "2 ème arbitre", "1er arbitre", "2ème arbitre",
    "Marqueur", "Aide marqueur", "Opérateur 24s", "Chronométreur",
    "Main referee", "Second referee", "Scorer", "Timer", "Timekeeper", "24s operator",
    "Arbitre principal", "Second arbitre",
    "Arbitre principal 1", "Arbitre principal 2",
}

class AssignmentCreate(BaseInSchema):
    referee_id: str = Field(..., min_length=1, max_length=50)
    referee_function: str = Field(..., min_length=1, max_length=100)
    indemnity: Optional[float] = Field(0.0, ge=0, le=100000)
    indemnity_home: Optional[float] = Field(None, ge=0, le=100000)
    indemnity_away: Optional[float] = Field(None, ge=0, le=100000)
    paying_team_id: Optional[str] = Field(None, max_length=50)

    @field_validator("referee_function")
    @classmethod
    def validate_function(cls, v: str) -> str:
        clean = v.strip()
        if clean not in VALID_FUNCTIONS:
            # Allow clean string up to 100 chars if not in standard list
            if len(clean) > 100:
                raise ValueError("Nom de fonction trop long")
        return clean

class MatchSummaryOut(BaseOutSchema):
    id: str
    match_number: Optional[str] = None
    home_team_id: str
    away_team_id: str
    home_team: Optional[TeamOut] = None
    away_team: Optional[TeamOut] = None
    date: str
    time: str
    city: str
    venue: str
    division: str
    category: str
    gender: Optional[str] = "Homme"
    status: str = "scheduled"

class AssignmentOut(BaseOutSchema):
    id: str
    match_id: str
    match: Optional[MatchSummaryOut] = None
    referee_id: str
    referee: Optional[RefereeSummaryOut] = None
    referee_function: str
    indemnity: float
    indemnity_home: Optional[float] = None
    indemnity_away: Optional[float] = None
    paying_team_id: Optional[str] = None
    paying_team: Optional[TeamOut] = None
    status: str
    refusal_reason: Optional[str] = None
    receipt: Optional[ReceiptOut] = None
    last_reminded_at: Optional[Union[str, datetime]] = None
    needs_attention: bool = False
    created_at: Optional[Union[str, datetime]] = None

    @field_serializer("created_at")
    def serialize_created_at(self, dt: Optional[Union[str, datetime]], _info) -> Optional[str]:
        if isinstance(dt, datetime):
            return dt.isoformat()
        return dt

    @field_serializer("last_reminded_at")
    def serialize_last_reminded_at(self, dt: Optional[Union[str, datetime]], _info) -> Optional[str]:
        if isinstance(dt, datetime):
            return dt.isoformat()
        return dt

# ----------------- MATCHES -----------------

class MatchCreate(BaseInSchema):
    home_team_id: str = Field(..., min_length=1, max_length=50)
    away_team_id: str = Field(..., min_length=1, max_length=50)
    date: Optional[str] = Field(None, max_length=20)
    match_date: Optional[str] = Field(None, max_length=20)
    time: Optional[str] = Field("18:30", max_length=10)
    city: str = Field(..., min_length=1, max_length=100)
    venue: str = Field(..., min_length=1, max_length=150)
    division: str = Field(..., min_length=1, max_length=50)
    category: str = Field(..., min_length=1, max_length=50)
    gender: Optional[str] = Field("Homme", max_length=20)
    assignments: List[AssignmentCreate]

    @field_validator("division")
    @classmethod
    def validate_division(cls, v: str) -> str:
        clean = v.strip()
        if clean not in VALID_DIVISIONS:
            raise ValueError(f"Division invalide: {clean}. Valeurs acceptées: 1DV, 2DV, 3DV")
        return clean

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        clean = v.strip()
        matched = next((c for c in VALID_CATEGORIES if c.lower() == clean.lower()), None)
        if not matched:
            raise ValueError(f"Catégorie invalide: {clean}. Valeurs acceptées: Seniors, U19, U16, U14, U12, U10, U8")
        return matched

class MatchUpdate(BaseInSchema):
    home_team_id: Optional[str] = Field(None, max_length=50)
    away_team_id: Optional[str] = Field(None, max_length=50)
    date: Optional[str] = Field(None, max_length=20)
    match_date: Optional[str] = Field(None, max_length=20)
    time: Optional[str] = Field(None, max_length=10)
    city: Optional[str] = Field(None, min_length=1, max_length=100)
    venue: Optional[str] = Field(None, min_length=1, max_length=150)
    division: Optional[str] = Field(None, max_length=50)
    category: Optional[str] = Field(None, max_length=50)
    gender: Optional[str] = Field(None, max_length=20)
    assignments: Optional[List[AssignmentCreate]] = None

    @field_validator("division")
    @classmethod
    def validate_division(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        clean = v.strip()
        if clean not in VALID_DIVISIONS:
            raise ValueError(f"Division invalide: {clean}. Valeurs acceptées: 1DV, 2DV, 3DV")
        return clean

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        clean = v.strip()
        matched = next((c for c in VALID_CATEGORIES if c.lower() == clean.lower()), None)
        if not matched:
            raise ValueError(f"Catégorie invalide: {clean}. Valeurs acceptées: Seniors, U19, U16, U14, U12, U10, U8")
        return matched

class MatchOut(MatchSummaryOut):
    assignments: List[AssignmentOut] = []
    assignments_count: Optional[int] = None
    confirmed_count: Optional[int] = None
    pending_count: Optional[int] = None
    refused_count: Optional[int] = None

class RefuseInput(BaseInSchema):
    reason: Optional[str] = Field(None, max_length=500)

# ----------------- NOTIFICATIONS -----------------

class NotificationOut(BaseOutSchema):
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

# ----------------- STATS -----------------

class PastMatchItem(BaseOutSchema):
    id: str
    home_team: str
    away_team: str
    date: str
    division: str
    status: str
    indemnity: float

class RefereeStatsOut(BaseOutSchema):
    total_assigned: int
    confirmed: int
    refused: int
    acceptance_rate: int
    past_matches: List[PastMatchItem] = []

class AdminStatsOut(BaseOutSchema):
    upcoming_matches: int
    pending_responses: int
    refused_this_month: int

class RefereeDetailOut(RefereeOut):
    history: List[AssignmentOut] = []
    stats: Optional[RefereeStatsOut] = None
