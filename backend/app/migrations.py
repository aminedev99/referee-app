import logging
from sqlalchemy import text
from app.database import engine

logger = logging.getLogger(__name__)

def run_migrations() -> None:
    """Run idempotent schema migrations using raw SQL."""
    statements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ NULL;",
        "ALTER TABLE referees ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;",
        "ALTER TABLE referees ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'Homme' NOT NULL;",
        "ALTER TABLE matches ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'scheduled' NOT NULL;",
        "ALTER TABLE matches ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'Homme' NOT NULL;",
        "ALTER TABLE assignments ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ NULL;",
        "ALTER TABLE assignments ADD COLUMN IF NOT EXISTS indemnity_home FLOAT NULL;",
        "ALTER TABLE assignments ADD COLUMN IF NOT EXISTS indemnity_away FLOAT NULL;",
        "ALTER TABLE assignments ALTER COLUMN paying_team_id DROP NOT NULL;",
        "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS number VARCHAR(20);",
        # Ensure existing receipts have number populated from receipt_number if null
        "UPDATE receipts SET number = receipt_number WHERE number IS NULL AND receipt_number IS NOT NULL;",
        # Partial unique index on license_number
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_referees_license_number_unique ON referees (license_number) WHERE license_number IS NOT NULL;",
        # Unique index on receipts.number
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_number_unique ON receipts (number) WHERE number IS NOT NULL;",
        # Translate legacy notification strings to French
        "UPDATE notifications SET title = REPLACE(title, ' confirmed', ' a confirmé') WHERE title LIKE '% confirmed%';",
        "UPDATE notifications SET description = REPLACE(description, ' confirmed ', ' a confirmé sa désignation pour ') WHERE description LIKE '% confirmed %';",
        "UPDATE notifications SET title = REPLACE(title, ' refused', ' a refusé') WHERE title LIKE '% refused%';",
        "UPDATE notifications SET description = REPLACE(description, ' refused ', ' a refusé sa désignation pour ') WHERE description LIKE '% refused %';",
        "UPDATE notifications SET title = 'Reçu disponible' WHERE title = 'Receipt available';",
        "UPDATE notifications SET description = REPLACE(description, 'Receipt available: ', 'Reçu disponible pour la rencontre ') WHERE description LIKE 'Receipt available: %';",
        "UPDATE notifications SET title = 'Nouvelle désignation' WHERE title = 'New assignment';",
        "UPDATE notifications SET description = REPLACE(description, 'New assignment: ', 'Nouvelle désignation : ') WHERE description LIKE 'New assignment: %';",
        "UPDATE notifications SET title = 'Match annulé' WHERE title = 'Match cancelled';",
        "UPDATE notifications SET description = REPLACE(description, 'Match cancelled: ', 'Match annulé : ') WHERE description LIKE 'Match cancelled: %';",
        "UPDATE notifications SET title = 'Désignation annulée' WHERE title LIKE 'Assignment cancelled%';",
        "UPDATE notifications SET description = REPLACE(description, 'Assignment cancelled: ', 'Désignation annulée : ') WHERE description LIKE 'Assignment cancelled: %';",
    ]

    for stmt in statements:
        try:
            with engine.begin() as conn:
                conn.execute(text(stmt))
        except Exception as e:
            logger.warning("Migration statement note: %s - %s", stmt, e)
