import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENV: str = os.getenv("ENV", "development")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/referee_db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-for-jwt-referee-app-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    RECEIPTS_DIR: str = os.getenv("RECEIPTS_DIR", "/code/receipts")
    SEED_ADMIN_EMAIL: str = "admin@referee.local"
    SEED_ADMIN_PASSWORD: str = "Admin12345!"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
