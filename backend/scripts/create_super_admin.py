import getpass
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pydantic import ValidationError

from database import SessionLocal
from models import Role, User
from schemas import ProfileUpdate, SignupRequest
from security import hash_password

ROLE_NAMES = ("super_admin", "admin", "student")


def ask_password() -> str:
    while True:
        password = getpass.getpass("Password (min 10 chars): ")
        if len(password) < 10:
            print("Password must be at least 10 characters.")
            continue
        if len(password.encode("utf-8")) > 72:
            print("Password must be at most 72 bytes.")
            continue
        if getpass.getpass("Confirm password: ") != password:
            print("Passwords do not match.")
            continue
        return password


def ask_details() -> tuple[str, str, str | None, str | None]:
    while True:
        full_name = input("Full name: ").strip()
        email = input("Email: ").strip()
        roll_number = input("Roll number (optional): ").strip() or None
        phone = input("Phone (optional): ").strip() or None
        try:
            signup = SignupRequest(full_name=full_name, primary_email=email, password="x" * 10)
            profile = ProfileUpdate(roll_number=roll_number, phone=phone)
        except ValidationError as error:
            for item in error.errors():
                print(f"Invalid {'.'.join(str(part) for part in item['loc'])}: {item['msg']}")
            continue
        return signup.full_name, signup.primary_email.lower(), profile.roll_number, profile.phone


def main() -> int:
    full_name, email, roll_number, phone = ask_details()
    db = SessionLocal()
    try:
        roles = {}
        for name in ROLE_NAMES:
            role = db.query(Role).filter(Role.name == name).first()
            if role is None:
                role = Role(name=name)
                db.add(role)
                db.flush()
            roles[name] = role

        existing = db.query(User).filter(User.primary_email == email).first()
        if existing is not None:
            answer = input("A user with this email already exists. Promote to super_admin? [y/N]: ").strip().lower()
            if answer != "y":
                db.rollback()
                print("No changes made.")
                return 1
            existing.role_id = roles["super_admin"].id
            existing.is_active = True
        else:
            password = ask_password()
            db.add(
                User(
                    full_name=full_name,
                    primary_email=email,
                    roll_number=roll_number,
                    phone=phone,
                    hashed_password=hash_password(password),
                    role_id=roles["super_admin"].id,
                    is_active=True,
                )
            )
        db.commit()
        print(f"Super admin created: {email}")
        return 0
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
