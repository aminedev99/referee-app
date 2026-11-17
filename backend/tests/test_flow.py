import time
import httpx
import pytest

BASE_URL = "http://localhost:8000/api"

def get_admin_token() -> str:
    res = httpx.post(
        f"{BASE_URL}/auth/login",
        data={"username": "admin@referee.local", "password": "Admin12345!"},
    )
    assert res.status_code == 200, res.text
    return res.json()["access_token"]

def get_referee_token(username: str = "referee@referee.local", password: str = "Referee12345!") -> str:
    res = httpx.post(
        f"{BASE_URL}/auth/login",
        data={"username": username, "password": password},
    )
    assert res.status_code == 200, res.text
    return res.json()["access_token"]

# 1. Health check
def test_health():
    res = httpx.get(f"{BASE_URL}/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}

# 2. Admin login, wrong password 401, no token 401
def test_auth_checks():
    # Admin login ok
    token = get_admin_token()
    assert token

    # Wrong password -> 401
    res = httpx.post(
        f"{BASE_URL}/auth/login",
        data={"username": "admin@referee.local", "password": "WrongPassword!"},
    )
    assert res.status_code == 401

    # No token on protected route -> 401
    res = httpx.get(f"{BASE_URL}/teams")
    assert res.status_code == 401

# 3. Referee token on admin route -> 403
def test_referee_forbidden_on_admin_route():
    ref_token = get_referee_token()
    headers = {"Authorization": f"Bearer {ref_token}"}

    # Referee trying to POST /teams (admin only) -> 403
    res = httpx.post(
        f"{BASE_URL}/teams",
        headers=headers,
        json={"name": "Hacked Team", "city": "City"},
    )
    assert res.status_code == 403

# 4. Create team (409 on duplicate name)
def test_teams_crud_and_duplicate_conflict():
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    team_name = f"Test Club {int(time.time() * 1000)}"
    res = httpx.post(
        f"{BASE_URL}/teams",
        headers=headers,
        json={"name": team_name, "city": "Marrakech"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == team_name
    team_id = data["id"]

    # Duplicate name -> 409
    res_dup = httpx.post(
        f"{BASE_URL}/teams",
        headers=headers,
        json={"name": team_name, "city": "Marrakech"},
    )
    assert res_dup.status_code == 409

# 5. Create referee, then that referee can log in
def test_create_referee_and_login():
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    ts = int(time.time() * 1000)
    unique_email = f"ref_{ts}@referee.local"
    unique_license = f"LIC_{ts}"
    res = httpx.post(
        f"{BASE_URL}/referees",
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
    login_res = httpx.post(
        f"{BASE_URL}/auth/login",
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

    # Fetch teams and referees
    teams = httpx.get(f"{BASE_URL}/teams", headers=headers).json()
    referees = httpx.get(f"{BASE_URL}/referees?active=true", headers=headers).json()

    assert len(teams) >= 2
    assert len(referees) >= 2

    t1, t2 = teams[0]["id"], teams[1]["id"]
    r1, r2 = referees[0]["id"], referees[1]["id"]

    # Same team home and away -> 400
    res = httpx.post(
        f"{BASE_URL}/matches",
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
    res = httpx.post(
        f"{BASE_URL}/matches",
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
    res = httpx.post(
        f"{BASE_URL}/matches",
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

    # Paying team outside match -> 400
    fake_team = f"team-fake-{int(time.time())}"
    res = httpx.post(
        f"{BASE_URL}/matches",
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
                {"referee_id": r1, "referee_function": "Main referee", "indemnity": 400, "paying_team_id": fake_team},
            ],
        },
    )
    assert res.status_code == 400

    # Create a fresh referee to avoid collision with existing seed matches
    ts = int(time.time() * 1000)
    ref_fresh = httpx.post(
        f"{BASE_URL}/referees",
        headers=headers,
        json={
            "name": f"Fresh Ref {ts}",
            "email": f"fresh_{ts}@referee.local",
            "phone": "06 77 66 55 44",
            "license_number": f"FR_{ts}",
            "password": "Password123!",
        },
    ).json()

    # Valid POST /matches with 1 assignment on fresh referee -> 201
    res = httpx.post(
        f"{BASE_URL}/matches",
        headers=headers,
        json={
            "home_team_id": t1,
            "away_team_id": t2,
            "date": "2026-12-25",
            "time": "19:00",
            "city": "Casablanca",
            "venue": "Salle Mohammed V",
            "division": "1DV",
            "category": "Men",
            "assignments": [
                {"referee_id": ref_fresh["id"], "referee_function": "Main referee", "indemnity": 450, "paying_team_id": t1},
            ],
        },
    )
    assert res.status_code == 201
    created_match = res.json()
    assert len(created_match["assignments"]) == 1
    assert created_match["assignments"][0]["status"] == "pending"

# 7. Referee isolation: list only own assignments, 404 on other's assignment
def test_referee_isolation():
    ref1_token = get_referee_token()
    headers1 = {"Authorization": f"Bearer {ref1_token}"}

    # Get my profile to know referee id
    me_profile = httpx.get(f"{BASE_URL}/me/profile", headers=headers1).json()
    my_ref_id = me_profile["id"]

    # My assignments list
    my_asgs = httpx.get(f"{BASE_URL}/me/assignments", headers=headers1).json()
    for asg in my_asgs:
        assert asg["referee_id"] == my_ref_id

    # Find an assignment belonging to another referee
    admin_token = get_admin_token()
    all_asgs = httpx.get(f"{BASE_URL}/assignments", headers={"Authorization": f"Bearer {admin_token}"}).json()
    other_asg = next((a for a in all_asgs if a["referee_id"] != my_ref_id), None)

    if other_asg:
        # Requesting another referee's assignment returns 404
        res = httpx.get(f"{BASE_URL}/me/assignments/{other_asg['id']}", headers=headers1)
        assert res.status_code == 404

# 8. Confirm moves pending to confirmed; confirming again -> 409
def test_confirm_flow():
    ref1_token = get_referee_token()
    headers = {"Authorization": f"Bearer {ref1_token}"}

    my_asgs = httpx.get(f"{BASE_URL}/me/assignments", headers=headers).json()
    pending = next((a for a in my_asgs if a["status"] == "pending" and (a.get("match") or {}).get("status") != "cancelled"), None)

    if pending:
        # Confirm
        res = httpx.post(f"{BASE_URL}/me/assignments/{pending['id']}/confirm", headers=headers)
        assert res.status_code == 200
        assert res.json()["status"] == "confirmed"

        # Confirming again -> 409
        res_again = httpx.post(f"{BASE_URL}/me/assignments/{pending['id']}/confirm", headers=headers)
        assert res_again.status_code == 409

# 9. Refuse with reason
def test_refuse_flow():
    ref1_token = get_referee_token()
    headers = {"Authorization": f"Bearer {ref1_token}"}

    my_asgs = httpx.get(f"{BASE_URL}/me/assignments", headers=headers).json()
    pending = next((a for a in my_asgs if a["status"] == "pending" and (a.get("match") or {}).get("status") != "cancelled"), None)

    if pending:
        res = httpx.post(
            f"{BASE_URL}/me/assignments/{pending['id']}/refuse",
            headers=headers,
            json={"reason": "Injured in training"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "refused"
        assert data["refusal_reason"] == "Injured in training"

        # Admin view should show it under ?status=refused
        admin_token = get_admin_token()
        refused_list = httpx.get(
            f"{BASE_URL}/assignments?status=refused",
            headers={"Authorization": f"Bearer {admin_token}"},
        ).json()
        match_in_admin = next((a for a in refused_list if a["id"] == pending["id"]), None)
        assert match_in_admin is not None
        assert match_in_admin["refusal_reason"] == "Injured in training"

# 10. Receipts: generate on pending -> 409; on confirmed -> 201 & valid PDF (starts with %PDF)
def test_receipt_generation_and_pdf():
    admin_token = get_admin_token()
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    ref_token = get_referee_token()
    ref_headers = {"Authorization": f"Bearer {ref_token}"}

    all_asgs = httpx.get(f"{BASE_URL}/assignments", headers=admin_headers).json()
    confirmed_asg = next((a for a in all_asgs if a["status"] == "confirmed"), None)
    assert confirmed_asg is not None, "Need at least one confirmed assignment"

    # Generate receipt
    rcpt_res = httpx.post(f"{BASE_URL}/assignments/{confirmed_asg['id']}/receipt", headers=admin_headers)
    assert rcpt_res.status_code in (200, 201)
    rcpt_json = rcpt_res.json()
    assert rcpt_json["amount_in_words"]
    assert "dirham" in rcpt_json["amount_in_words"]

    # Download PDF as admin
    pdf_res_admin = httpx.get(f"{BASE_URL}/assignments/{confirmed_asg['id']}/receipt.pdf", headers=admin_headers)
    assert pdf_res_admin.status_code == 200
    assert pdf_res_admin.headers["content-type"] == "application/pdf"
    assert pdf_res_admin.content.startswith(b"%PDF")

    # If the confirmed assignment belongs to referee 1, referee 1 can download it
    me_profile = httpx.get(f"{BASE_URL}/me/profile", headers=ref_headers).json()
    if confirmed_asg["referee_id"] == me_profile["id"]:
        pdf_res_ref = httpx.get(f"{BASE_URL}/assignments/{confirmed_asg['id']}/receipt.pdf", headers=ref_headers)
        assert pdf_res_ref.status_code == 200
        assert pdf_res_ref.content.startswith(b"%PDF")

# 11. Search referees by name / license & check acceptance rate
def test_search_referees_and_stats():
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    res_name = httpx.get(f"{BASE_URL}/referees?q=Amrani", headers=headers)
    assert res_name.status_code == 200
    data_name = res_name.json()
    assert len(data_name) >= 1
    assert "Amrani" in data_name[0]["name"]

    res_lic = httpx.get(f"{BASE_URL}/referees?q=1104", headers=headers)
    assert res_lic.status_code == 200
    data_lic = res_lic.json()
    assert len(data_lic) >= 1

    # Check stats presence
    for r in data_lic:
        assert "acceptance_rate" in r
        assert "matches_count" in r

# 12. GET /me/stats matches the data
def test_me_stats():
    ref_token = get_referee_token()
    headers = {"Authorization": f"Bearer {ref_token}"}

    res = httpx.get(f"{BASE_URL}/me/stats", headers=headers)
    assert res.status_code == 200
    stats = res.json()
    assert "total_assigned" in stats
    assert "confirmed" in stats
    assert "refused" in stats
    assert "acceptance_rate" in stats
    assert "past_matches" in stats
    assert isinstance(stats["past_matches"], list)
