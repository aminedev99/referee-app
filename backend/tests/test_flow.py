import time
import pytest
from starlette.testclient import TestClient

from app.main import app
from app.config import settings

client = TestClient(app)

def get_admin_token() -> str:
    admin_email = settings.ADMIN_EMAIL or "admin@draarbitre.com"
    admin_pass = settings.ADMIN_PASSWORD or "AdminSecure2026!"
    res = client.post(
        "/api/auth/login",
        data={"username": admin_email, "password": admin_pass},
    )
    assert res.status_code == 200, res.text
    return res.json()["access_token"]

def create_test_referee(admin_token: str, name_prefix: str = "TestRef") -> dict:
    ts = int(time.time() * 1000)
    res = client.post(
        "/api/referees",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": f"{name_prefix} {ts}",
            "email": f"ref_{ts}@testdomain.ma",
            "phone": "06 12 34 56 78",
            "license_number": f"LIC_{ts}",
            "password": "SecurePassword123!",
        },
    )
    assert res.status_code == 201, res.text
    return {**res.json(), "password": "SecurePassword123!"}

def create_test_team(admin_token: str, name_prefix: str = "TestClub") -> dict:
    ts = int(time.time() * 1000)
    res = client.post(
        "/api/teams",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": f"{name_prefix} {ts}", "city": "Casablanca"},
    )
    assert res.status_code == 201, res.text
    return res.json()

def get_referee_token(ref_info: dict = None) -> tuple[str, dict]:
    admin_token = get_admin_token()
    if not ref_info:
        ref_info = create_test_referee(admin_token)
    login_res = client.post(
        "/api/auth/login",
        data={"username": ref_info["email"], "password": ref_info["password"]},
    )
    assert login_res.status_code == 200, login_res.text
    return login_res.json()["access_token"], ref_info

# 1. Health check
def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}

# 2. Admin login, wrong password 401, no token 401
def test_auth_checks():
    admin_token = get_admin_token()
    assert admin_token

    # Wrong password -> 401
    admin_email = settings.ADMIN_EMAIL or "admin@draarbitre.com"
    res = client.post(
        "/api/auth/login",
        data={"username": admin_email, "password": "WrongPassword123!"},
    )
    assert res.status_code == 401

    # No token on protected route -> 401
    res = client.get("/api/teams")
    assert res.status_code == 401

# 3. Referee token on admin route -> 403
def test_referee_forbidden_on_admin_route():
    ref_token, _ = get_referee_token()
    headers = {"Authorization": f"Bearer {ref_token}"}

    # Referee trying to POST /teams (admin only) -> 403
    res = client.post(
        "/api/teams",
        headers=headers,
        json={"name": "Hacked Team", "city": "City"},
    )
    assert res.status_code == 403

# 4. Create team (409 on duplicate name)
def test_teams_crud_and_duplicate_conflict():
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    team_name = f"Test Club {int(time.time() * 1000)}"
    res = client.post(
        "/api/teams",
        headers=headers,
        json={"name": team_name, "city": "Marrakech"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == team_name
    team_id = data["id"]

    # Duplicate name -> 409
    res_dup = client.post(
        "/api/teams",
        headers=headers,
        json={"name": team_name, "city": "Marrakech"},
    )
    assert res_dup.status_code == 409

# 5. Create referee, then that referee can log in
def test_create_referee_and_login():
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    ts = int(time.time() * 1000)
    unique_email = f"ref_{ts}@testreferee.ma"
    unique_license = f"LIC_{ts}"
    res = client.post(
        "/api/referees",
        headers=headers,
        json={
            "name": "Nabil Test",
            "email": unique_email,
            "phone": "06 99 88 77 66",
            "license_number": unique_license,
            "password": "Password123!",
        },
    )
    assert res.status_code == 201
    ref_data = res.json()
    assert ref_data["email"] == unique_email
    assert ref_data["phone"] == "+212699887766"

    # Login as this newly created referee
    login_res = client.post(
        "/api/auth/login",
        data={"username": unique_email, "password": "Password123!"},
    )
    assert login_res.status_code == 200
    login_json = login_res.json()
    assert login_json["role"] == "referee"
    assert login_json["user"]["referee_id"] == ref_data["id"]

# 6. POST /matches validation rules & creation with notifications
def test_create_match_validations():
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Dynamically create teams and referees to avoid relying on seed data
    t1_data = create_test_team(admin_token, "TeamHome")
    t2_data = create_test_team(admin_token, "TeamAway")
    r1_data = create_test_referee(admin_token, "RefOne")
    r2_data = create_test_referee(admin_token, "RefTwo")

    t1, t2 = t1_data["id"], t2_data["id"]
    r1, r2 = r1_data["id"], r2_data["id"]

    # Same team home and away -> 400
    res = client.post(
        "/api/matches",
        headers=headers,
        json={
            "home_team_id": t1,
            "away_team_id": t1,
            "date": "2026-12-01",
            "time": "18:00",
            "city": "Rabat",
            "venue": "Salle Test",
            "division": "1DV",
            "category": "Men",
            "assignments": [
                {"referee_id": r1, "referee_function": "Main referee", "indemnity": 400, "paying_team_id": t1}
            ],
        },
    )
    assert res.status_code == 400
    assert "Away team must differ" in res.json()["detail"]

    # Empty assignments -> 400
    res = client.post(
        "/api/matches",
        headers=headers,
        json={
            "home_team_id": t1,
            "away_team_id": t2,
            "date": "2026-12-01",
            "time": "18:00",
            "city": "Rabat",
            "venue": "Salle Test",
            "division": "1DV",
            "category": "Men",
            "assignments": [],
        },
    )
    assert res.status_code == 400

    # Duplicate referee -> 400
    res = client.post(
        "/api/matches",
        headers=headers,
        json={
            "home_team_id": t1,
            "away_team_id": t2,
            "date": "2026-12-01",
            "time": "18:00",
            "city": "Rabat",
            "venue": "Salle Test",
            "division": "1DV",
            "category": "Men",
            "assignments": [
                {"referee_id": r1, "referee_function": "Main referee", "indemnity": 400, "paying_team_id": t1},
                {"referee_id": r1, "referee_function": "Second referee", "indemnity": 300, "paying_team_id": t2},
            ],
        },
    )
    assert res.status_code == 400
    assert "Duplicate referee" in res.json()["detail"]

    # Valid POST /matches with 1 assignment -> 201
    res = client.post(
        "/api/matches",
        headers=headers,
        json={
            "home_team_id": t1,
            "away_team_id": t2,
            "date": "2026-12-25",
            "time": "19:00",
            "city": "Casablanca",
            "venue": "Salle Test",
            "division": "1DV",
            "category": "Men",
            "assignments": [
                {"referee_id": r1, "referee_function": "Main referee", "indemnity": 450, "paying_team_id": t1},
            ],
        },
    )
    assert res.status_code == 201
    created_match = res.json()
    assert len(created_match["assignments"]) == 1
    assert created_match["assignments"][0]["status"] == "pending"

# 7. Referee isolation: list only own assignments, 404 on other's assignment
def test_referee_isolation():
    admin_token = get_admin_token()
    ref1_data = create_test_referee(admin_token, "RefIso1")
    ref2_data = create_test_referee(admin_token, "RefIso2")

    ref1_token, _ = get_referee_token(ref1_data)
    headers1 = {"Authorization": f"Bearer {ref1_token}"}

    # Create match with assignment for ref2
    t1 = create_test_team(admin_token, "TeamIso1")["id"]
    t2 = create_test_team(admin_token, "TeamIso2")["id"]

    match_res = client.post(
        "/api/matches",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "home_team_id": t1,
            "away_team_id": t2,
            "date": "2026-12-30",
            "time": "18:00",
            "city": "Rabat",
            "venue": "Salle Iso",
            "division": "1DV",
            "category": "Men",
            "assignments": [
                {"referee_id": ref2_data["id"], "referee_function": "Main referee", "indemnity": 400, "paying_team_id": t1}
            ],
        },
    )
    assert match_res.status_code == 201
    asg2_id = match_res.json()["assignments"][0]["id"]

    # Referee 1 requesting referee 2's assignment returns 404
    res = client.get(f"/api/me/assignments/{asg2_id}", headers=headers1)
    assert res.status_code == 404

# 8. Confirm moves pending to confirmed; confirming again -> 409
def test_confirm_flow():
    admin_token = get_admin_token()
    ref_data = create_test_referee(admin_token, "RefConfirm")
    ref_token, _ = get_referee_token(ref_data)
    headers = {"Authorization": f"Bearer {ref_token}"}

    t1 = create_test_team(admin_token, "TeamC1")["id"]
    t2 = create_test_team(admin_token, "TeamC2")["id"]

    match_res = client.post(
        "/api/matches",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "home_team_id": t1,
            "away_team_id": t2,
            "date": "2026-12-31",
            "time": "18:00",
            "city": "Rabat",
            "venue": "Salle Conf",
            "division": "1DV",
            "category": "Men",
            "assignments": [
                {"referee_id": ref_data["id"], "referee_function": "Main referee", "indemnity": 400, "paying_team_id": t1}
            ],
        },
    )
    asg_id = match_res.json()["assignments"][0]["id"]

    # Confirm
    res = client.post(f"/api/me/assignments/{asg_id}/confirm", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "confirmed"

    # Confirming again -> 409
    res_again = client.post(f"/api/me/assignments/{asg_id}/confirm", headers=headers)
    assert res_again.status_code == 409

# 9. Refuse with reason
def test_refuse_flow():
    admin_token = get_admin_token()
    ref_data = create_test_referee(admin_token, "RefRefuse")
    ref_token, _ = get_referee_token(ref_data)
    headers = {"Authorization": f"Bearer {ref_token}"}

    t1 = create_test_team(admin_token, "TeamR1")["id"]
    t2 = create_test_team(admin_token, "TeamR2")["id"]

    match_res = client.post(
        "/api/matches",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "home_team_id": t1,
            "away_team_id": t2,
            "date": "2026-12-31",
            "time": "18:00",
            "city": "Rabat",
            "venue": "Salle Refuse",
            "division": "1DV",
            "category": "Men",
            "assignments": [
                {"referee_id": ref_data["id"], "referee_function": "Main referee", "indemnity": 400, "paying_team_id": t1}
            ],
        },
    )
    asg_id = match_res.json()["assignments"][0]["id"]

    res = client.post(
        f"/api/me/assignments/{asg_id}/refuse",
        headers=headers,
        json={"reason": "Unavailable on match day"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "refused"
    assert res.json()["refusal_reason"] == "Unavailable on match day"

# 10. Receipts: generate on pending -> 409; on confirmed -> 201 & valid PDF (starts with %PDF)
def test_receipt_generation_and_pdf():
    admin_token = get_admin_token()
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    ref_data = create_test_referee(admin_token, "RefReceipt")
    ref_token, _ = get_referee_token(ref_data)
    ref_headers = {"Authorization": f"Bearer {ref_token}"}

    t1 = create_test_team(admin_token, "TeamRcpt1")["id"]
    t2 = create_test_team(admin_token, "TeamRcpt2")["id"]

    match_res = client.post(
        "/api/matches",
        headers=admin_headers,
        json={
            "home_team_id": t1,
            "away_team_id": t2,
            "date": "2026-12-28",
            "time": "18:00",
            "city": "Rabat",
            "venue": "Salle Rcpt",
            "division": "1DV",
            "category": "Men",
            "assignments": [
                {"referee_id": ref_data["id"], "referee_function": "Main referee", "indemnity": 450, "paying_team_id": t1}
            ],
        },
    )
    asg_id = match_res.json()["assignments"][0]["id"]

    # Cannot generate receipt on pending -> 409
    res_pending = client.post(f"/api/assignments/{asg_id}/receipt", headers=admin_headers)
    assert res_pending.status_code == 409

    # Confirm assignment
    client.post(f"/api/me/assignments/{asg_id}/confirm", headers=ref_headers)

    # Generate receipt
    rcpt_res = client.post(f"/api/assignments/{asg_id}/receipt", headers=admin_headers)
    assert rcpt_res.status_code in (200, 201)
    rcpt_json = rcpt_res.json()
    assert rcpt_json["amount_in_words"]
    assert "dirham" in rcpt_json["amount_in_words"]

    # Download PDF as admin
    pdf_res_admin = client.get(f"/api/assignments/{asg_id}/receipt.pdf", headers=admin_headers)
    assert pdf_res_admin.status_code == 200
    assert pdf_res_admin.headers["content-type"] == "application/pdf"
    assert pdf_res_admin.headers.get("x-content-type-options") == "nosniff"
    assert pdf_res_admin.content.startswith(b"%PDF")

    # Download PDF as referee
    pdf_res_ref = client.get(f"/api/assignments/{asg_id}/receipt.pdf", headers=ref_headers)
    assert pdf_res_ref.status_code == 200
    assert pdf_res_ref.content.startswith(b"%PDF")
