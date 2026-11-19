from datetime import datetime, timedelta, timezone
from typing import Optional, Any
import bcrypt
import jwt
from app.config import settings

# Common weak passwords that must be rejected
COMMON_WEAK_PASSWORDS = {
    "password",
    "password123",
    "12345678",
    "123456789",
    "1234567890",
    "admin12345!",
    "referee12345!",
    "admin123",
    "admin1234",
    "admin12345",
    "qwertyuiop",
    "azertyuiop",
    "letmein123",
    "welcome123",
}

# Pre-computed dummy hash used to prevent user-enumeration timing attacks
DUMMY_BCRYPT_HASH = bcrypt.hashpw(b"dummy_timing_probe_string", bcrypt.gensalt()).decode("utf-8")

def is_weak_password(password: str) -> bool:
    if not password or len(password) < 8:
        return True
    return password.strip().lower() in COMMON_WEAK_PASSWORDS

def validate_password_strength(password: str, min_length: int = 8) -> None:
    if not password:
        raise ValueError("Le mot de passe est obligatoire.")
    if len(password) < min_length:
        raise ValueError(f"Le mot de passe doit comporter au moins {min_length} caractères.")
    if password.strip().lower() in COMMON_WEAK_PASSWORDS:
        raise ValueError("Ce mot de passe est trop simple et n'est pas autorisé.")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def verify_dummy_password(password: str) -> bool:
    """Perform constant-time comparison against a dummy hash when email is not found."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), DUMMY_BCRYPT_HASH.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def create_access_token(
    user_id: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a signed JWT containing ONLY sub, role, exp, iat."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    to_encode: dict[str, Any] = {
        "sub": str(user_id),
        "role": str(role),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
