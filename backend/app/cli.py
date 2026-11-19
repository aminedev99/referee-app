import sys
import getpass
from datetime import datetime, timezone
from app.database import SessionLocal
from app.models import User
from app.security import (
    get_password_hash,
    validate_password_strength,
)

def reset_admin_password():
    print("=== Emergency Admin Password Reset ===")
    email = input("Admin email address [press Enter to select first admin]: ").strip().lower()
    
    db = SessionLocal()
    try:
        if email:
            admin = db.query(User).filter(User.email == email, User.role == "admin").first()
            if not admin:
                print(f"Error: No administrator found with email '{email}'.")
                sys.exit(1)
        else:
            admin = db.query(User).filter(User.role == "admin").first()
            if not admin:
                print("Error: No administrator account exists in the database.")
                sys.exit(1)
            print(f"Selected administrator: {admin.email} ({admin.name})")

        new_password = getpass.getpass("Enter new admin password (min 12 characters): ").strip()
        confirm_password = getpass.getpass("Confirm new password: ").strip()

        if new_password != confirm_password:
            print("Error: Passwords do not match.")
            sys.exit(1)

        try:
            validate_password_strength(new_password, min_length=12)
        except ValueError as e:
            print(f"Error: {e}")
            sys.exit(1)

        admin.hashed_password = get_password_hash(new_password)
        admin.password_changed_at = datetime.now(timezone.utc)
        admin.is_active = True
        db.commit()
        print(f"Success: Password for {admin.email} updated successfully. All previous sessions invalidated.")
    finally:
        db.close()

def create_admin():
    print("=== Create Additional Administrator ===")
    email = input("Admin email: ").strip().lower()
    if not email or "@" not in email:
        print("Error: A valid email address is required.")
        sys.exit(1)

    name = input("Full Name [Administrator]: ").strip()
    if not name:
        name = "Administrator"

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"Error: A user with email '{email}' already exists.")
            sys.exit(1)

        password = getpass.getpass("Admin password (min 12 characters): ").strip()
        confirm_password = getpass.getpass("Confirm password: ").strip()

        if password != confirm_password:
            print("Error: Passwords do not match.")
            sys.exit(1)

        try:
            validate_password_strength(password, min_length=12)
        except ValueError as e:
            print(f"Error: {e}")
            sys.exit(1)

        admin = User(
            email=email,
            name=name,
            hashed_password=get_password_hash(password),
            role="admin",
            is_active=True,
            password_changed_at=datetime.now(timezone.utc),
        )
        db.add(admin)
        db.commit()
        print(f"Success: Admin account '{email}' created successfully.")
    finally:
        db.close()

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python -m app.cli reset-admin-password")
        print("  python -m app.cli create-admin")
        sys.exit(1)

    command = sys.argv[1].lower().strip()
    if command == "reset-admin-password":
        reset_admin_password()
    elif command == "create-admin":
        create_admin()
    else:
        print(f"Unknown command: {command}")
        print("Available commands: reset-admin-password, create-admin")
        sys.exit(1)

if __name__ == "__main__":
    main()
