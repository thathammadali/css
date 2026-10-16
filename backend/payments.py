import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session as DBSession

from auth import get_current_user, require_roles
from database import get_db
from models import Registration, User
from registrations import to_registration_out
from schemas import PaymentReject, RegistrationOut

router = APIRouter(prefix="/registrations", tags=["payments"])

UPLOAD_DIR = Path(__file__).parent / "uploads" / "receipts"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_SIZE = 5 * 1024 * 1024  # 5 MB

SIGNATURES = {
    b"%PDF": "pdf",
    b"\xff\xd8\xff": "jpg",
    b"\x89PNG\r\n\x1a\n": "png",
}


def detect_file_type(header: bytes) -> str | None:
    for signature, ext in SIGNATURES.items():
        if header.startswith(signature):
            return ext
    return None


def _can_access(registration: Registration, user: User) -> bool:
    return registration.user_id == user.id or user.role.name in ("admin", "super_admin")


@router.post("/{registration_id}/receipt", response_model=RegistrationOut)
async def upload_receipt(
    registration_id: int,
    file: UploadFile = File(...),
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    registration = db.get(Registration, registration_id)
    if registration is None:
        raise HTTPException(status_code=404, detail="Registration not found.")
    if registration.user_id != user.id:
        raise HTTPException(status_code=403, detail="You can only upload a receipt for your own registration.")
    if registration.status not in ("PAYMENT_PENDING", "PAYMENT_REJECTED"):
        raise HTTPException(status_code=400, detail=f"Cannot upload a receipt while status is '{registration.status}'.")

    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File is too large. Maximum size is 5 MB.")

    ext = detect_file_type(contents[:8])
    if ext is None:
        raise HTTPException(status_code=400, detail="File must be a genuine PDF, JPG, or PNG.")

    filename = f"registration_{registration_id}.{ext}"
    filepath = UPLOAD_DIR / filename
    with open(filepath, "wb") as f:
        f.write(contents)

    registration.receipt_path = str(filename)
    registration.status = "PAYMENT_PENDING"
    registration.payment_rejection_reason = None
    db.commit()
    db.refresh(registration)
    return to_registration_out(registration)


@router.get("/{registration_id}/receipt")
def download_receipt(
    registration_id: int,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    registration = db.get(Registration, registration_id)
    if registration is None or not registration.receipt_path:
        raise HTTPException(status_code=404, detail="No receipt found for this registration.")
    if not _can_access(registration, user):
        raise HTTPException(status_code=403, detail="You do not have permission to view this receipt.")
    filepath = UPLOAD_DIR / registration.receipt_path
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Receipt file is missing on the server.")
    return FileResponse(filepath)


@router.post("/{registration_id}/approve", response_model=RegistrationOut)
def approve_payment(
    registration_id: int,
    db: DBSession = Depends(get_db),
    user: User = Depends(require_roles("admin", "super_admin")),
):
    registration = db.get(Registration, registration_id)
    if registration is None:
        raise HTTPException(status_code=404, detail="Registration not found.")
    if registration.status != "PAYMENT_PENDING":
        raise HTTPException(status_code=400, detail=f"Cannot approve from status '{registration.status}'.")
    if not registration.receipt_path:
        raise HTTPException(status_code=400, detail="No receipt has been uploaded yet.")

    registration.status = "CONFIRMED"
    registration.reviewed_by = user.id
    from datetime import datetime, timezone
    registration.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(registration)
    return to_registration_out(registration)


@router.post("/{registration_id}/reject", response_model=RegistrationOut)
def reject_payment(
    registration_id: int,
    data: PaymentReject,
    db: DBSession = Depends(get_db),
    user: User = Depends(require_roles("admin", "super_admin")),
):
    registration = db.get(Registration, registration_id)
    if registration is None:
        raise HTTPException(status_code=404, detail="Registration not found.")
    if registration.status != "PAYMENT_PENDING":
        raise HTTPException(status_code=400, detail=f"Cannot reject from status '{registration.status}'.")

    registration.status = "PAYMENT_REJECTED"
    registration.payment_rejection_reason = data.reason
    registration.reviewed_by = user.id
    from datetime import datetime, timezone
    registration.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(registration)
    return to_registration_out(registration)
