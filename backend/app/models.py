import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="referee") # "admin" | "referee"
    is_active = Column(Boolean, default=True, nullable=False)
    password_changed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    referee = relationship("Referee", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class Referee(Base):
    __tablename__ = "referees"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), unique=True, nullable=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    license_number = Column(String(50), nullable=False)
    category = Column(String(100), default="National Referee")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    user = relationship("User", back_populates="referee")
    assignments = relationship("Assignment", back_populates="referee")

    __table_args__ = (
        Index(
            "idx_referees_license_number_unique",
            "license_number",
            unique=True,
            postgresql_where=(license_number.isnot(None)),
        ),
    )

class Team(Base):
    __tablename__ = "teams"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), unique=True, index=True, nullable=False)
    city = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

class Match(Base):
    __tablename__ = "matches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    match_number = Column(String(50), nullable=True)
    home_team_id = Column(String(36), ForeignKey("teams.id"), nullable=False)
    away_team_id = Column(String(36), ForeignKey("teams.id"), nullable=False)
    date = Column(String(50), nullable=False) # e.g. "2026-11-22"
    time = Column(String(50), nullable=False) # e.g. "18:30"
    city = Column(String(255), nullable=False)
    venue = Column(String(255), nullable=False)
    division = Column(String(50), nullable=False) # "1DV" | "2DV"
    category = Column(String(50), nullable=False) # "Men" | "Women"
    status = Column(String(20), default="scheduled", nullable=False) # "scheduled" | "cancelled"
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    home_team = relationship("Team", foreign_keys=[home_team_id])
    away_team = relationship("Team", foreign_keys=[away_team_id])
    assignments = relationship("Assignment", back_populates="match", cascade="all, delete-orphan")

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    match_id = Column(String(36), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False)
    referee_id = Column(String(36), ForeignKey("referees.id", ondelete="CASCADE"), nullable=False)
    referee_function = Column(String(100), nullable=False)
    indemnity = Column(Float, nullable=False)
    paying_team_id = Column(String(36), ForeignKey("teams.id"), nullable=False)
    status = Column(String(50), nullable=False, default="pending") # "pending" | "confirmed" | "refused"
    refusal_reason = Column(String(500), nullable=True)
    last_reminded_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    match = relationship("Match", back_populates="assignments")
    referee = relationship("Referee", back_populates="assignments")
    paying_team = relationship("Team", foreign_keys=[paying_team_id])
    receipt = relationship("Receipt", back_populates="assignment", uselist=False, cascade="all, delete-orphan")

class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    assignment_id = Column(String(36), ForeignKey("assignments.id", ondelete="CASCADE"), unique=True, nullable=False)
    receipt_number = Column(String(50), nullable=False)
    number = Column(String(20), unique=True, nullable=True)
    issued_at = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    amount_in_words = Column(String(255), nullable=False)
    pdf_path = Column(String(500), nullable=False)

    assignment = relationship("Assignment", back_populates="receipt")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(String(500), nullable=False)
    read = Column(Boolean, default=False)
    type = Column(String(50), default="assignment")
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    user = relationship("User", back_populates="notifications")
