import os
from typing import Optional
from pydantic_settings import BaseSettings

KNOWN_DEV_SECRETS = {
    "super-secret-key-for-jwt-referee-app-2026",
    "secret",
    "changeme",
    "your-secret-key",
    "default-secret",
    "admin12345",
    "password",
}

class Settings(BaseSettings):
    ENV: str = os.getenv("ENV", "development")
    DOMAIN: str = os.getenv("DOMAIN", "admin.draarbitre.com")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/referee_db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", os.getenv("SECRET_KEY", "super-secret-key-for-jwt-referee-app-2026"))
    ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "720"))
    RECEIPTS_DIR: str = os.getenv("RECEIPTS_DIR", "receipts" if os.name == "nt" else "/code/receipts")
    ADMIN_EMAIL: Optional[str] = os.getenv("ADMIN_EMAIL")
    ADMIN_PASSWORD: Optional[str] = os.getenv("ADMIN_PASSWORD")
    ADMIN_NAME: str = os.getenv("ADMIN_NAME", "Administrator")

    @property
    def SECRET_KEY(self) -> str:
        return self.JWT_SECRET

    @property
    def ACCESS_TOKEN_EXPIRE_MINUTES(self) -> int:
        return self.JWT_EXPIRE_MINUTES

    class Config:
        env_file = ".env"
        extra = "ignore"

def validate_jwt_secret_in_production(settings_obj: Settings) -> None:
    if settings_obj.ENV == "production":
        secret = settings_obj.JWT_SECRET
        if not secret or len(secret) < 32 or secret.lower() in KNOWN_DEV_SECRETS:
            raise RuntimeError(
                "CRITICAL SECURITY CONFIGURATION ERROR: In production (ENV=production), "
                "JWT_SECRET must be at least 32 characters long and cannot be a default/dev value."
            )

settings = Settings()
validate_jwt_secret_in_production(settings)
