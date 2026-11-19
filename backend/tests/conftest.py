import os
import pytest
from app.database import engine, Base, SessionLocal
from app.migrations import run_migrations
from app.main import bootstrap_admin
from app.services.rate_limiter import login_rate_limiter

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Ensure database schema and migrations are initialized for the test session."""
    Base.metadata.create_all(bind=engine)
    run_migrations()
    db = SessionLocal()
    try:
        bootstrap_admin(db)
    finally:
        db.close()
    yield

@pytest.fixture(autouse=True)
def reset_rate_limits():
    """Reset rate limiter before and after each test."""
    login_rate_limiter.reset()
    yield
    login_rate_limiter.reset()
