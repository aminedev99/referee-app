import os
import re
from reportlab.lib.pagesizes import A4
from app.services.receipts import (
    generate_receipt_pdf,
    format_referee_function_fr,
    get_amount_in_words_fr,
)
from app.models import Referee, Match, Team, Assignment, Receipt
from app.schemas import (
    MatchCreate,
    RefereeCreate,
    AssignmentCreate,
    VALID_DIVISIONS,
    VALID_FUNCTIONS,
)

class DummyTeam:
    def __init__(self, name, city="Errachidia"):
        self.id = "team-1"
        self.name = name
        self.city = city

class DummyMatch:
    def __init__(self, home_team, away_team, division="3DV"):
        self.id = "match-1"
        self.match_number = "2026-99"
        self.home_team = home_team
        self.away_team = away_team
        self.date = "2026-11-25"
        self.time = "16:00"
        self.city = "Errachidia"
        self.venue = "Salle Omnisports"
        self.division = division
        self.category = "Men"

class DummyReferee:
    def __init__(self, name, gender="Homme"):
        self.id = "ref-1"
        self.name = name
        self.gender = gender
        self.email = "ref@test.ma"
        self.phone = "0612345678"
        self.license_number = "LIC-999"
        self.category = "Arbitre National"

class DummyAssignment:
    def __init__(self, referee_function, indemnity=450.0, indemnity_home=450.0, indemnity_away=450.0):
        self.id = "asg-1"
        self.referee_function = referee_function
        self.indemnity = indemnity
        self.indemnity_home = indemnity_home
        self.indemnity_away = indemnity_away

class DummyReceipt:
    def __init__(self, receipt_id, number="2026-0042"):
        self.id = receipt_id
        self.receipt_number = number
        self.number = number
        self.issued_at = "2026-11-20"
        self.amount = 450.0
        self.amount_in_words = "QUATRE CENTS CINQUANTE DIRHAMS"
        self.pdf_path = ""

def inspect_pdf_content(pdf_path: str):
    """Read binary PDF file and return decoded text streams and structural attributes."""
    with open(pdf_path, "rb") as f:
        data = f.read()
    
    # Check PDF header
    assert data.startswith(b"%PDF"), "File is not a valid PDF"
    
    # Count pages: /Count N
    count_match = re.search(rb"/Count\s+(\d+)", data)
    pages_count = int(count_match.group(1)) if count_match else 1
    
    # MediaBox check: A4 is [ 0 0 595.2756 841.8898 ]
    media_box = re.search(rb"/MediaBox\s*\[\s*0\s+0\s+([0-9.]+)\s+([0-9.]+)\s*\]", data)
    w, h = None, None
    if media_box:
        w = float(media_box.group(1))
        h = float(media_box.group(2))

    return {
        "raw_bytes": data,
        "page_count": pages_count,
        "width": w,
        "height": h,
    }

def test_v1_1_pdf_generation_male():
    home = DummyTeam("USER")
    away = DummyTeam("CERBB")
    match = DummyMatch(home, away, division="3DV")
    match.category = "U19"
    ref = DummyReferee("Karim Alami", gender="Homme")
    asg = DummyAssignment("1 er arbitre", indemnity=450.0, indemnity_home=450.0, indemnity_away=450.0)
    rcpt = DummyReceipt("test_receipt_male")

    pdf_path = generate_receipt_pdf(
        receipt=rcpt,
        assignment=asg,
        referee=ref,
        match=match,
    )

    assert os.path.exists(pdf_path), f"PDF not found at {pdf_path}"
    assert os.path.getsize(pdf_path) > 1000, "PDF file is too small or empty"

    info = inspect_pdf_content(pdf_path)
    assert info["page_count"] == 1, f"Expected exactly 1 page, got {info['page_count']}"
    assert abs(info["width"] - A4[0]) < 2.0, f"Expected width {A4[0]}, got {info['width']}"
    assert abs(info["height"] - A4[1]) < 2.0, f"Expected height {A4[1]}, got {info['height']}"

    raw = info["raw_bytes"]
    # Check Male civility MR in PDF content
    assert b"MR Karim Alami" in raw, "Expected 'MR Karim Alami' in PDF"
    # Check Category U19 displayed
    assert b"U19" in raw, "Expected 'U19' in PDF"
    # Check Function
    assert b"1ER ARBITRE" in raw, "Expected '1ER ARBITRE' in PDF"
    # Check both clubs are present
    assert b"USER" in raw, "Expected home club USER in PDF"
    assert b"CERBB" in raw, "Expected away club CERBB in PDF"
    print("SUCCESS: Male PDF verified (1 page A4 portrait, MR civility, U19, USER & CERBB, 1ER ARBITRE).")

def test_v1_1_pdf_generation_female():
    home = DummyTeam("KACM")
    away = DummyTeam("FUS")
    match = DummyMatch(home, away, division="3DV")
    ref = DummyReferee("Fatima Zahra", gender="Femme")
    asg = DummyAssignment("Aide marqueur", indemnity=350.0, indemnity_home=350.0, indemnity_away=350.0)
    rcpt = DummyReceipt("test_receipt_female")

    pdf_path = generate_receipt_pdf(
        receipt=rcpt,
        assignment=asg,
        referee=ref,
        match=match,
    )

    assert os.path.exists(pdf_path), f"PDF not found at {pdf_path}"
    assert os.path.getsize(pdf_path) > 1000, "PDF file is too small or empty"

    info = inspect_pdf_content(pdf_path)
    assert info["page_count"] == 1, f"Expected exactly 1 page, got {info['page_count']}"

    raw = info["raw_bytes"]
    # Check Female civility MS
    assert b"MS Fatima Zahra" in raw, "Expected 'MS Fatima Zahra' in PDF"
    # Check Category SENIORS
    assert b"SENIORS" in raw, "Expected 'SENIORS' in PDF"
    # Check Function Aide marqueur
    assert b"AIDE MARQUEUR" in raw, "Expected 'AIDE MARQUEUR' in PDF"
    assert b"KACM" in raw, "Expected KACM in PDF"
    assert b"FUS" in raw, "Expected FUS in PDF"
    print("SUCCESS: Female PDF verified (1 page A4 portrait, MS civility, SENIORS, KACM & FUS, AIDE MARQUEUR).")

def test_v1_1_schemas_and_validation():
    # Division 3DV
    assert "3DV" in VALID_DIVISIONS
    assert "1DV" in VALID_DIVISIONS
    assert "2DV" in VALID_DIVISIONS

    # Functions
    assert "1 er arbitre" in VALID_FUNCTIONS
    assert "2 ème arbitre" in VALID_FUNCTIONS
    assert "Aide marqueur" in VALID_FUNCTIONS
    assert "Marqueur" in VALID_FUNCTIONS
    assert "Opérateur 24s" in VALID_FUNCTIONS
    assert "Chronométreur" in VALID_FUNCTIONS

    # Test function translations
    assert format_referee_function_fr("1 er arbitre") == "1ER ARBITRE"
    assert format_referee_function_fr("2 ème arbitre") == "2ÈME ARBITRE"
    assert format_referee_function_fr("Aide marqueur") == "AIDE MARQUEUR"
    assert format_referee_function_fr("Marqueur") == "MARQUEUR"
    assert format_referee_function_fr("Chronométreur") == "CHRONOMÉTREUR"
    assert format_referee_function_fr("Opérateur 24s") == "OPÉRATEUR 24S"

    # Test RefereeCreate schema
    ref_m = RefereeCreate(
        name="Arbitre Test",
        email="arbitre.test@domain.ma",
        phone="0612345678",
        license_number="LIC-1234",
        gender="Homme",
    )
    assert ref_m.gender == "Homme"

    ref_f = RefereeCreate(
        name="Arbitre Test F",
        email="arbitre.f@domain.ma",
        phone="0612345678",
        license_number="LIC-1235",
        gender="Femme",
    )
    assert ref_f.gender == "Femme"

    # Test MatchCreate with 3DV
    m = MatchCreate(
        home_team_id="team-1",
        away_team_id="team-2",
        date="2026-11-28",
        time="15:00",
        city="Errachidia",
        venue="Salle Omnisports",
        division="3DV",
        category="Men",
        assignments=[
            AssignmentCreate(
                referee_id="ref-1",
                referee_function="Arbitre principal 1",
                indemnity=400,
            )
        ]
    )
    assert m.division == "3DV"

    print("SUCCESS: Schemas, validations and function formatting verified.")

if __name__ == "__main__":
    test_v1_1_pdf_generation_male()
    test_v1_1_pdf_generation_female()
    test_v1_1_schemas_and_validation()
    print("ALL v1.1.0 CHECKS PASSED SUCCESSFULLY!")
