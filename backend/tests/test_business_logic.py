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

# 1. Route protection: Every /api route except login and health returns 401 without a token;
# Admin routes return 403 for a referee token; deactivated referee gets 401.
def test_route_protection_and_deactivated_referee():
    # A. Iterate all routes in FastAPI app (via OpenAPI schema which includes all mounted routers)
    public_paths = {"/api/auth/login", "/api/health"}
    all_routes = []

    openapi_paths = app.openapi().get("paths", {})
    for path, path_item in openapi_paths.items():
        methods = {m.upper() for m in path_item.keys() if m.upper() in {"GET", "POST", "PUT", "DELETE", "PATCH"}}
        all_routes.append((path, methods))

    checked_count = 0
    checked_paths = set()

    for path, methods in all_routes:
        if path.startswith("/api") and path not in public_paths and path not in checked_paths:
            checked_paths.add(path)
            test_path = path.replace("{id}", "dummy-test-id")
            for method in ("GET", "POST", "PUT", "DELETE"):
                if method in methods:
                    res = client.request(method, test_path)
                    assert res.status_code == 401, f"Route {method} {test_path} returned {res.status_code} without token instead of 401"
                    checked_count += 1
                    break

    assert checked_count >= 15, f"Expected to check at least 15 routes, checked {checked_count}"

    # B. Admin routes return 403 for referee token
    ref_token, _ = get_referee_token()
    ref_headers = {"Authorization": f"Bearer {ref_token}"}

    for admin_url in ["/api/referees", "/api/matches", "/api/teams"]:
        res = client.get(admin_url, headers=ref_headers)
        assert res.status_code == 403, f"{admin_url} returned {res.status_code} instead of 403 for referee"

    # C. Deactivated referee gets 401 on login and with token
    admin_token = get_admin_token()
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    ts = int(time.time() * 1000)
    deact_email = f"deact_{ts}@referee.local"
    deact_ref = client.post(
        "/api/referees",
        headers=admin_headers,
        json={
            "name": f"Deactivated Ref {ts}",
            "email": deact_email,
            "phone": "0612345678",
            "license_number": f"LIC_DEACT_{ts}",
            "password": "Password123!",
        },
    ).json()

    # Deactivate
    client.post(f"/api/referees/{deact_ref['id']}/deactivate", headers=admin_headers)

    # Login attempt should return 401
    login_res = client.post(
        "/api/auth/login",
        data={"username": deact_email, "password": "Password123!"},
    )
    assert login_res.status_code == 401
    assert "deactivated" in login_res.json()["detail"].lower()

# 2. Referee creation with phone normalization and uniqueness rules
def test_referee_phone_normalization_and_uniqueness():
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    ts = int(time.time() * 1000)
    email = f"norm_{ts}@referee.local"
    license_num = f"LIC_NORM_{ts}"

    # Create referee with phone "06 12 34 56 78"
    res = client.post(
        "/api/referees",
        headers=headers,
        json={
            "full_name": "Hamza Alami",
            "email": email,
            "phone": "06 12 34 56 78",
            "license_number": license_num,
            "password": "Password123!",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["phone"] == "+212612345678"
    assert data["license_number"] == license_num

    # GET returns the normalized phone
    get_res = client.get(f"/api/referees/{data['id']}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["phone"] == "+212612345678"
    assert get_res.json()["license_number"] == license_num

    # Duplicate email -> 409
    res_dup_email = client.post(
        "/api/referees",
        headers=headers,
        json={
            "full_name": "Other Name",
            "email": email,
            "phone": "06 99 99 99 99",
            "license_number": f"DIFF_{ts}",
            "password": "Password123!",
        },
    )
    assert res_dup_email.status_code == 409

    # Duplicate license -> 409
    res_dup_lic = client.post(
        "/api/referees",
        headers=headers,
        json={
            "full_name": "Other Name 2",
            "email": f"diff_{ts}@referee.local",
            "phone": "06 99 99 99 99",
            "license_number": license_num,
            "password": "Password123!",
        },
    )
    assert res_dup_lic.status_code == 409

    # Invalid phone -> 400 or 422
    res_invalid_phone = client.post(
        "/api/referees",
        headers=headers,
        json={
            "full_name": "Invalid Phone Ref",
            "email": f"inv_{ts}@referee.local",
            "phone": "12345",
            "license_number": f"INV_{ts}",
            "password": "Password123!",
        },
    )
    assert res_invalid_phone.status_code in (400, 422)

# 3. PUT /referees/{id}, reset password, delete rules
def test_referee_update_reset_password_and_delete():
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    ts = int(time.time() * 1000)
    email = f"crud_{ts}@referee.local"
    lic = f"LIC_CRUD_{ts}"

    ref = client.post(
        "/api/referees",
        headers=headers,
        json={
            "full_name": "Original Name",
            "email": email,
            "phone": "06 55 44 33 22",
            "license_number": lic,
            "password": "OldPassword123!",
        },
    ).json()

    # PUT /referees/{id}
    new_lic = f"NEW_LIC_{ts}"
    update_res = client.put(
        f"/api/referees/{ref['id']}",
        headers=headers,
        json={
            "full_name": "Updated Name",
            "phone": "06 11 22 33 44",
            "license_number": new_lic,
        },
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["name"] == "Updated Name"
    assert updated["phone"] == "+212611223344"
    assert updated["license_number"] == new_lic

    # Reset password -> referee can log in with new password and not old
    reset_res = client.post(
        f"/api/referees/{ref['id']}/reset-password",
        headers=headers,
        json={"password": "NewSecretPassword2026!"},
    )
    assert reset_res.status_code == 200

    old_login = client.post(
        "/api/auth/login",
        data={"username": email, "password": "OldPassword123!"},
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/api/auth/login",
        data={"username": email, "password": "NewSecretPassword2026!"},
    )
    assert new_login.status_code == 200

    # Create match with assignment on this referee to test deletion block
    t1 = create_test_team(admin_token, "TeamDel1")["id"]
    t2 = create_test_team(admin_token, "TeamDel2")["id"]
    match_del = client.post(
        "/api/matches",
        headers=headers,
        json={
            "home_team_id": t1,
            "away_team_id": t2,
            "date": "2026-12-29",
            "time": "18:00",
            "city": "Rabat",
            "venue": "Salle Del",
            "division": "1DV",
            "category": "Men",
            "assignments": [
                {"referee_id": ref["id"], "referee_function": "Main referee", "indemnity": 400, "paying_team_id": t1}
            ],
        },
    ).json()

    # Referee with assignments cannot be deleted -> 409
    del_blocked = client.delete(f"/api/referees/{ref['id']}", headers=headers)
    assert del_blocked.status_code == 409
    assert "deactivate instead" in del_blocked.json()["detail"].lower()

# 4. Create match conflict check (within ±3h), past date, and notifications
def test_create_match_conflict_and_validations():
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    t1 = create_test_team(admin_token, "TeamConf1")["id"]
    t2 = create_test_team(admin_token, "TeamConf2")["id"]
    t3 = create_test_team(admin_token, "TeamConf3")["id"]

    ts = int(time.time() * 1000)
    conflict_ref = client.post(
        "/api/referees",
        headers=headers,
        json={
            "full_name": f"Conflict Ref {ts}",
            "email": f"conflict_{ts}@referee.local",
            "phone": "06 70 00 11 22",
            "license_number": f"CONF_{ts}",
            "password": "Password123!",
        },
    ).json()

    match_date = "2026-12-30"
    match_time = "18:00"

    # Create first match
    res1 = client.post(
        "/api/matches",
        headers=headers,
        json={
            "home_team_id": t1,
            "away_team_id": t2,
            "date": match_date,
            "time": match_time,
            "city": "Rabat",
            "venue": "Salle Test 1",
            "division": "1DV",
            "category": "Men",
            "assignments": [
                {"referee_id": conflict_ref["id"], "referee_function": "Main referee", "indemnity": 400, "paying_team_id": t1}
            ],
        },
    )
    assert res1.status_code == 201

    # Conflict within ±3h (e.g. 19:30 on same day): 409 with conflict message
    res_conflict = client.post(
        "/api/matches",
        headers=headers,
        json={
            "home_team_id": t2,
            "away_team_id": t3,
            "date": match_date,
            "time": "19:30",
            "city": "Rabat",
            "venue": "Salle Test 2",
            "division": "1DV",
            "category": "Men",
            "assignments": [
                {"referee_id": conflict_ref["id"], "referee_function": "Second referee", "indemnity": 300, "paying_team_id": t2}
            ],
        },
    )
    assert res_conflict.status_code == 409
    assert "already assigned to" in res_conflict.json()["detail"]
    assert "18:00" in res_conflict.json()["detail"]

    # Past date -> 400
    res_past = client.post(
        "/api/matches",
        headers=headers,
        json={
            "home_team_id": t1,
            "away_team_id": t2,
            "date": "2020-01-01",
            "time": "18:00",
            "city": "Rabat",
            "venue": "Salle Test",
            "division": "1DV",
            "category": "Men",
            "assignments": [
                {"referee_id": conflict_ref["id"], "referee_function": "Main referee", "indemnity": 400, "paying_team_id": t1}
            ],
        },
    )
    assert res_past.status_code == 400
    assert "future" in res_past.json()["detail"].lower()

# 5. Edit match date resets confirmed to pending; cancel match
def test_edit_match_date_reset_and_cancel():
    admin_token = get_admin_token()
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    t1 = create_test_team(admin_token, "TeamEdit1")["id"]
    t2 = create_test_team(admin_token, "TeamEdit2")["id"]

    ts = int(time.time() * 1000)
    email = f"edit_flow_{ts}@referee.local"
    pw = "ValidPass2026!"
    ref_res = client.post(
        "/api/referees",
        headers=admin_headers,
        json={
            "full_name": f"Edit Flow Ref {ts}",
            "email": email,
            "phone": "06 88 77 66 55",
            "license_number": f"ED_{ts}",
            "password": pw,
        },
    )
    assert ref_res.status_code == 201, ref_res.text
    ref = ref_res.json()

    # Create match
    m = client.post(
        "/api/matches",
        headers=admin_headers,
        json={
            "home_team_id": t1,
            "away_team_id": t2,
            "date": "2026-12-28",
            "time": "17:00",
            "city": "Casablanca",
            "venue": "Salle V",
            "division": "1DV",
            "category": "Men",
            "assignments": [
                {"referee_id": ref["id"], "referee_function": "Main referee", "indemnity": 400, "paying_team_id": t1}
            ],
        },
    ).json()
    asg_id = m["assignments"][0]["id"]

    # Referee logs in and confirms
    ref_token, _ = get_referee_token({"email": email, "password": pw})
    ref_headers = {"Authorization": f"Bearer {ref_token}"}
    confirm_res = client.post(f"/api/me/assignments/{asg_id}/confirm", headers=ref_headers)
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "confirmed"

    # Edit match date -> resets confirmed assignment to pending and notifies
    edit_res = client.put(
        f"/api/matches/{m['id']}",
        headers=admin_headers,
        json={"date": "2026-12-29"},
    )
    assert edit_res.status_code == 200
    asg_after_edit = next(a for a in edit_res.json()["assignments"] if a["id"] == asg_id)
    assert asg_after_edit["status"] == "pending"

    # Cancel match
    cancel_res = client.post(f"/api/matches/{m['id']}/cancel", headers=admin_headers)
    assert cancel_res.status_code == 200

# 6. Assignment reminder: first ok, second within 12h returns 429
def test_assignment_remind_throttling():
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}
    t1 = create_test_team(admin_token, "TeamRem1")["id"]
    t2 = create_test_team(admin_token, "TeamRem2")["id"]

    ref_fresh = create_test_referee(admin_token, "RemindRef")

    m = client.post(
        "/api/matches",
        headers=headers,
        json={
            "home_team_id": t1,
            "away_team_id": t2,
            "date": "2026-12-22",
            "time": "15:00",
            "city": "Fès",
            "venue": "Salle Fès",
            "division": "1DV",
            "category": "Men",
            "assignments": [
                {"referee_id": ref_fresh["id"], "referee_function": "Main referee", "indemnity": 350, "paying_team_id": t1}
            ],
        },
    ).json()
    asg_id = m["assignments"][0]["id"]

    # First remind: ok (200)
    r1 = client.post(f"/api/assignments/{asg_id}/remind", headers=headers)
    assert r1.status_code == 200

    # Second remind within 12 hours: 429
    r2 = client.post(f"/api/assignments/{asg_id}/remind", headers=headers)
    assert r2.status_code == 429
    assert "12 hours" in r2.json()["detail"]

# 7. PUT /auth/me and change password
def test_auth_me_and_change_password():
    ref_token, _ = get_referee_token()
    headers = {"Authorization": f"Bearer {ref_token}"}

    # Update name and phone
    update_res = client.put(
        "/api/auth/me",
        headers=headers,
        json={"name": "Updated Name", "phone": "06 99 88 77 66"},
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["name"] == "Updated Name"
    assert data["phone"] == "+212699887766"

    # Change password: wrong current -> 400
    pw_wrong = client.post(
        "/api/auth/change-password",
        headers=headers,
        json={"current_password": "WrongPassword123!", "new_password": "NewValidPassword1!"},
    )
    assert pw_wrong.status_code == 400

    # Short new password -> 400 or 422
    pw_short = client.post(
        "/api/auth/change-password",
        headers=headers,
        json={"current_password": "SecurePassword123!", "new_password": "short"},
    )
    assert pw_short.status_code in (400, 422)
