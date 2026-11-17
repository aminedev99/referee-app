import re
from fastapi import HTTPException, status

def normalize_moroccan_phone(phone: str) -> str:
    if not phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number is required",
        )
    # Strip spaces, dashes, dots, parentheses
    cleaned = re.sub(r"[\s\-\.\(\)]+", "", phone.strip())

    if cleaned.startswith("00212"):
        cleaned = "+212" + cleaned[5:]
    elif cleaned.startswith("212"):
        cleaned = "+212" + cleaned[3:]
    elif cleaned.startswith("0"):
        cleaned = "+212" + cleaned[1:]
    elif not cleaned.startswith("+"):
        cleaned = "+212" + cleaned

    # A valid Moroccan phone number with country code is +212 followed by 9 digits
    # (starts with 5 for landlines, 6 or 7 for mobiles)
    if not re.match(r"^\+212[567]\d{8}$", cleaned):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Moroccan phone number. Format must be e.g. 06 12 34 56 78 or +212612345678",
        )

    return cleaned
