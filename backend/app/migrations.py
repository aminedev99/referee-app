import logging
from sqlalchemy import text
from app.database import engine

logger = logging.getLogger(__name__)

def run_migrations() -> None:
    """Run idempotent schema migrations using raw SQL."""
    statements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;",
        "ALTER TABLE referees ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;",
        "ALTER TABLE matches ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'scheduled' NOT NULL;",
        "ALTER TABLE assignments ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ NULL;",
        "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS number VARCHAR(20);",
        # Ensure existing receipts have number populated from receipt_number if null
        "UPDATE receipts SET number = receipt_number WHERE number IS NULL AND receipt_number IS NOT NULL;",
        # Fix any potential duplicate license in existing seed before unique index
        "UPDATE referees SET license_number = '1115' WHERE email = 's.idrissi@mail.ma' AND license_number = '1104';",
        # Deduplicate any leftover test duplicate licenses
        """
        UPDATE referees r1 
        SET license_number = r1.license_number || '_' || substr(r1.id, 1, 4) 
        WHERE r1.id NOT IN (
            SELECT min(r2.id) FROM referees r2 WHERE r2.license_number = r1.license_number
        );
        """,
        # Partial unique index on license_number
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_referees_license_number_unique ON referees (license_number) WHERE license_number IS NOT NULL;",
        # Unique index on receipts.number
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_number_unique ON receipts (number) WHERE number IS NOT NULL;",
    ]

    for stmt in statements:
        try:
            with engine.begin() as conn:
                conn.execute(text(stmt))
        except Exception as e:
            logger.warning("Migration statement note: %s - %s", stmt, e)
