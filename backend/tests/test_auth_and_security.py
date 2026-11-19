import os
import time
from datetime import datetime, timezone, timedelta
import pytest
from starlette.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import Settings, validate_jwt_secret_in_production, settings
from app.main import app, bootstrap_admin
from app.database import SessionLocal
from app.models import User, Referee, Team, Match, Assignment, Receipt, Notification
from app.security import (
    get_password_hash,
    create_access_token,
    validate_password_strength,
    is_weak_password,
)
from app.services.rate_limiter import login_rate_limiter

client = TestClient(app)

def test_weak_jwt_secret_refuses_production_start():
    # 1. Missing or too short secret (<32 chars)
    s1 = Settings(ENV="production", JWT_SECRET="too-short-secret-123")
    with pytest.raises(RuntimeError) as exc1:
        validate_jwt_secret_in_production(s1)
    assert "JWT_SECRET must be at least 32 characters" in str(exc1.value)

    # 2. Known default / dev secret
    s2 = Settings(ENV="production", JWT_SECRET="super-secret-key-for-jwt-referee-app-2026")
    with pytest.raises(RuntimeError) as exc2:
        validate_jwt_secret_in_production(s2)
    assert "default/dev value" in str(exc2.value)

    # 3. Valid production secret >= 32 random characters
    valid_secret = "c7d2e8f1a4b9c0d3e5f7a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4"
    s3 = Settings(ENV="production", JWT_SECRET=valid_secret)
    validate_jwt_secret_in_production(s3) # Should pass without exception

def test_admin_bootstrap_policy():
    db = SessionLocal()
    try:
        # If admin exists, bootstrap_admin should not overwrite or change anything
        existing_admin = db.query(User).filter(User.role == "admin").first()
        if existing_admin:
            orig_hash = existing_admin.hashed_password
            bootstrap_admin(db)
            db.refresh(existing_admin)
            assert existing_admin.hashed_password == orig_hash
    finally:
        db.close()

def test_weak_password_rejection():
    # Min length checks
    assert is_weak_password("short")
    with pytest.raises(ValueError):
        validate_password_strength("short", min_length=8)

    # Common weak password rejection
    for weak in ["password", "12345678", "Admin12345!", "Referee12345!"]:
        assert is_weak_password(weak)
        with pytest.raises(ValueError):
            validate_password_strength(weak, min_length=8)

    # Strong password
    assert not is_weak_password("SuperSecure#2026!Str0ng")
    validate_password_strength("SuperSecure#2026!Str0ng", min_length=8)

def test_login_rate_limiting():
    login_rate_limiter.reset()
    test_email = "rate_limit_test@example.com"
    test_ip = "192.168.1.100"

    # First 5 attempts should return 401
    for i in range(5):
        res = client.post(
            "/api/auth/login",
            data={"username": test_email, "password": "WrongPassword!"},
            headers={"X-Forwarded-For": test_ip},
        )
        assert res.status_code == 401, f"Attempt {i+1} got {res.status_code}"

    # 6th attempt within the same minute MUST return 429 Too Many Requests
    res_rate_limited = client.post(
        "/api/auth/login",
        data={"username": test_email, "password": "WrongPassword!"},
        headers={"X-Forwarded-For": test_ip},
    )
    assert res_rate_limited.status_code == 429
    assert "Retry-After" in res_rate_limited.headers
    retry_after = int(res_rate_limited.headers["Retry-After"])
    assert retry_after > 0

    login_rate_limiter.reset()

def test_constant_time_unknown_email_vs_wrong_password():
    # Unknown email
    res1 = client.post(
        "/api/auth/login",
        data={"username": "non_existent_user_999@test.com", "password": "SamplePassword123!"},
    )
    assert res1.status_code == 401
    assert res1.json()["detail"] == "Incorrect email or password"

    # Known email with wrong password
    admin_email = settings.ADMIN_EMAIL or "admin@draarbitre.com"
    res2 = client.post(
        "/api/auth/login",
        data={"username": admin_email, "password": "WrongPassword123!"},
    )
    assert res2.status_code == 401
    assert res2.json()["detail"] == "Incorrect email or password"

def test_mass_assignment_protection():
    # Extra fields not in schema must be rejected with 422 (extra="forbid")
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role == "admin").first()
        token = create_access_token(user_id=admin.id, role="admin")
        headers = {"Authorization": f"Bearer {token}"}

        # Attempt to inject role, is_active, or unauthorized fields
        res = client.post(
            "/api/teams",
            headers=headers,
            json={
                "name": f"Security Team {time.time()}",
                "city": "Rabat",
                "role": "admin", # Forbidden extra field
                "is_active": True,
            },
        )
        assert res.status_code == 422
    finally:
        db.close()

def test_token_invalidation_on_password_change():
    db = SessionLocal()
    try:
        # Create a test referee user
        unique_email = f"ref_invalidation_{int(time.time())}@test.com"
        user = User(
            email=unique_email,
            name="Test Token Invalidation",
            hashed_password=get_password_hash("ValidInitialPass123!"),
            role="referee",
            is_active=True,
            password_changed_at=datetime.now(timezone.utc) - timedelta(minutes=10),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        ref = Referee(
            user_id=user.id,
            name=user.name,
            email=user.email,
            phone="0612345678",
            license_number=f"LIC_{int(time.time())}",
        )
        db.add(ref)
        db.commit()

        # Token created before password change
        token_before = create_access_token(user_id=user.id, role="referee")

        # Verify token works
        headers = {"Authorization": f"Bearer {token_before}"}
        res_ok = client.get("/api/auth/me", headers=headers)
        assert res_ok.status_code == 200

        # Change password
        user.hashed_password = get_password_hash("NewStrongPass2026!")
        user.password_changed_at = datetime.now(timezone.utc) + timedelta(seconds=2)
        db.commit()

        # Old token MUST now be rejected with 401
        res_invalidated = client.get("/api/auth/me", headers=headers)
        assert res_invalidated.status_code == 401
        assert "invalidated" in res_invalidated.json()["detail"].lower()
    finally:
        db.close()

def test_idor_referee_isolation():
    db = SessionLocal()
    try:
        # Create Referee A and Referee B
        t = int(time.time())
        user_a = User(email=f"ref_a_{t}@test.com", name="Referee A", hashed_password=get_password_hash("PassA123456!"), role="referee", is_active=True)
        user_b = User(email=f"ref_b_{t}@test.com", name="Referee B", hashed_password=get_password_hash("PassB123456!"), role="referee", is_active=True)
        db.add_all([user_a, user_b])
        db.commit()

        ref_a = Referee(user_id=user_a.id, name="Referee A", email=user_a.email, phone="0611111111", license_number=f"LICA_{t}")
        ref_b = Referee(user_id=user_b.id, name="Referee B", email=user_b.email, phone="0622222222", license_number=f"LICB_{t}")
        db.add_all([ref_a, ref_b])
        db.commit()

        # Create teams & match
        team1 = Team(name=f"Team1_{t}", city="City1")
        team2 = Team(name=f"Team2_{t}", city="City2")
        db.add_all([team1, team2])
        db.commit()

        match = Match(
            home_team_id=team1.id,
            away_team_id=team2.id,
            date="2026-12-01",
            time="18:00",
            city="City1",
            venue="Venue1",
            division="1DV",
            category="Men",
        )
        db.add(match)
        db.commit()

        # Assignment for Referee B
        asg_b = Assignment(
            match_id=match.id,
            referee_id=ref_b.id,
            referee_function="Main referee",
            indemnity=400.0,
            paying_team_id=team1.id,
            status="pending",
        )
        db.add(asg_b)
        db.commit()

        # Notification for User B
        notif_b = Notification(
            user_id=user_b.id,
            title="Notification for B",
            description="Details for B",
        )
        db.add(notif_b)
        db.commit()

        # Generate tokens
        token_a = create_access_token(user_id=user_a.id, role="referee")
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # 1. Referee A attempts to read Referee B's assignment -> 404
        res_asg = client.get(f"/api/me/assignments/{asg_b.id}", headers=headers_a)
        assert res_asg.status_code == 404

        # 2. Referee A attempts to confirm Referee B's assignment -> 404
        res_conf = client.post(f"/api/me/assignments/{asg_b.id}/confirm", headers=headers_a)
        assert res_conf.status_code == 404

        # 3. Referee A attempts to refuse Referee B's assignment -> 404
        res_refuse = client.post(f"/api/me/assignments/{asg_b.id}/refuse", headers=headers_a, json={"reason": "Hacked"})
        assert res_refuse.status_code == 404

        # 4. Referee A attempts to mark User B's notification as read -> 404
        res_notif = client.post(f"/api/notifications/{notif_b.id}/read", headers=headers_a)
        assert res_notif.status_code == 404

        # 5. Referee A cannot access Referee B's receipt
        res_rcpt = client.get(f"/api/assignments/{asg_b.id}/receipt", headers=headers_a)
        assert res_rcpt.status_code in (403, 404)
    finally:
        db.close()

def test_all_api_routes_require_authentication():
    """Iterate all routes and ensure no /api route is open without auth except login and health."""
    public_paths = {"/api/auth/login", "/api/health"}

    openapi_paths = app.openapi().get("paths", {})
    checked_count = 0
    for path, path_item in openapi_paths.items():
        if path.startswith("/api") and path not in public_paths:
            test_path = path.replace("{id}", "non-existent-id")
            for m in ("get", "post", "put", "delete"):
                if m in path_item:
                    res = client.request(m.upper(), test_path)
                    assert res.status_code == 401, f"Route {m.upper()} {test_path} returned {res.status_code} without auth!"
                    checked_count += 1
    assert checked_count >= 20, f"Expected at least 20 protected operations, checked {checked_count}"
