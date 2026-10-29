import csv
import io
import json
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session as DBSession, object_session

from auth import get_current_user, require_roles
from database import get_db
from models import Certificate, Event, EventSession, Registration, User
from schemas import (
    CertificateIssue,
    CertificateOut,
    CertificateRevoke,
    CertificateVerifyOut,
    TemplateUpdate,
)

router = APIRouter(tags=["certificates"])
admin_only = require_roles("admin", "super_admin")


def _code(db: DBSession) -> str:
    for _ in range(10):
        code = f"SEMS-{secrets.token_hex(3).upper()}-{secrets.token_hex(3).upper()}"
        if not db.query(Certificate.id).filter(Certificate.code == code).first():
            return code
    raise HTTPException(status_code=500, detail="Could not generate a certificate code.")


def _event_or_404(db: DBSession, event_id: int) -> Event:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")
    return event


def _certificate_response(certificate: Certificate) -> dict:
    response = CertificateOut.model_validate(certificate).model_dump()
    roll = None
    if certificate.user_id:
        session = object_session(certificate)
        owner = session.get(User, certificate.user_id) if session else None
        roll = owner.roll_number if owner else None
    response["recipient_roll"] = roll
    return response


@router.post("/events/{event_id}/certificates/issue", response_model=list[CertificateOut])
def issue_certificates(
    event_id: int,
    data: CertificateIssue,
    db: DBSession = Depends(get_db),
    admin: User = Depends(admin_only),
):
    _event_or_404(db, event_id)
    if data.user_ids is None:
        user_ids = {
            user_id
            for (user_id,) in db.query(Registration.user_id)
            .join(EventSession, Registration.session_id == EventSession.id)
            .filter(
                EventSession.event_id == event_id,
                Registration.attended.is_(True),
                Registration.status == "CONFIRMED",
            )
        }
        if not user_ids:
            raise HTTPException(status_code=400, detail="No attended registrations for this event.")
    else:
        user_ids = set(data.user_ids)
        if not user_ids:
            raise HTTPException(status_code=400, detail="user_ids is empty.")
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    missing = sorted(user_ids - {user.id for user in users})
    if missing:
        raise HTTPException(status_code=400, detail=f"Unknown user ids: {missing}")
    existing = {
        certificate.user_id: certificate
        for certificate in db.query(Certificate).filter(
            Certificate.event_id == event_id,
            Certificate.user_id.in_(user_ids),
        )
    }
    result = []
    for user in users:
        certificate = existing.get(user.id)
        if certificate is None:
            certificate = Certificate(
                code=_code(db),
                event_id=event_id,
                user_id=user.id,
                issued_by=admin.id,
                recipient_name=user.full_name,
            )
            db.add(certificate)
            db.flush()
        else:
            certificate.recipient_name = user.full_name
        certificate.category = data.category
        result.append(certificate)
    db.commit()
    return [_certificate_response(certificate) for certificate in result]


@router.post("/events/{event_id}/certificates/bulk", response_model=list[CertificateOut])
def bulk_certificates(
    event_id: int,
    file: UploadFile = File(...),
    db: DBSession = Depends(get_db),
    admin: User = Depends(admin_only),
):
    _event_or_404(db, event_id)
    raw = file.file.read()
    if len(raw) > 1_000_000:
        raise HTTPException(status_code=400, detail="CSV too large (max 1 MB).")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="CSV must be UTF-8 encoded.")
    reader = csv.DictReader(io.StringIO(text))
    headers = {(header or "").strip().lower() for header in (reader.fieldnames or [])}
    if "name" not in headers:
        raise HTTPException(status_code=400, detail="CSV must have a 'name' column.")
    rows, errors = [], []
    for index, row in enumerate(reader, start=2):
        clean_row = {
            (key or "").strip().lower(): (value or "").strip()
            for key, value in row.items()
        }
        if not any(clean_row.values()):
            continue
        name = clean_row.get("name", "")
        status = (clean_row.get("status") or "current").lower()
        student_id = clean_row.get("student_id") or None
        category = clean_row.get("category") or None
        if not name:
            errors.append(f"Row {index}: name is required")
        elif status not in ("current", "graduated"):
            errors.append(f"Row {index}: status must be current or graduated")
        elif status == "current" and not student_id:
            errors.append(f"Row {index}: student_id is required for current students")
        else:
            rows.append((name, status, student_id, category))
    if errors:
        raise HTTPException(status_code=400, detail="; ".join(errors[:20]))
    if not rows:
        raise HTTPException(status_code=400, detail="CSV has no data rows.")
    if len(rows) > 500:
        raise HTTPException(status_code=400, detail="Max 500 rows per upload.")
    existing = {
        (certificate.recipient_name.lower(), certificate.student_id or ""): certificate
        for certificate in db.query(Certificate).filter(
            Certificate.event_id == event_id,
            Certificate.user_id.is_(None),
        )
    }
    result = []
    for name, status, student_id, category in rows:
        key = (name.lower(), student_id or "")
        certificate = existing.get(key)
        if certificate is None:
            certificate = Certificate(
                code=_code(db),
                event_id=event_id,
                user_id=None,
                issued_by=admin.id,
                recipient_name=name,
                status_tag=status,
                student_id=student_id,
                category=category,
            )
            db.add(certificate)
            db.flush()
            existing[key] = certificate
        else:
            certificate.status_tag = status
            certificate.category = category
        result.append(certificate)
    db.commit()
    return [_certificate_response(certificate) for certificate in result]


@router.get("/events/{event_id}/certificates", response_model=list[CertificateOut])
def list_event_certificates(
    event_id: int,
    db: DBSession = Depends(get_db),
    admin: User = Depends(admin_only),
):
    _event_or_404(db, event_id)
    certificates = (
        db.query(Certificate)
        .filter(Certificate.event_id == event_id)
        .order_by(Certificate.id)
        .all()
    )
    return [_certificate_response(certificate) for certificate in certificates]


@router.get("/certificates/me", response_model=list[CertificateOut])
def my_certificates(db: DBSession = Depends(get_db), user: User = Depends(get_current_user)):
    certificates = (
        db.query(Certificate)
        .filter(Certificate.user_id == user.id)
        .order_by(Certificate.id.desc())
        .all()
    )
    return [_certificate_response(certificate) for certificate in certificates]


@router.post("/certificates/{certificate_id}/revoke", response_model=CertificateOut)
def revoke_certificate(
    certificate_id: int,
    data: CertificateRevoke,
    db: DBSession = Depends(get_db),
    admin: User = Depends(admin_only),
):
    certificate = db.get(Certificate, certificate_id)
    if certificate is None:
        raise HTTPException(status_code=404, detail="Certificate not found.")
    if certificate.revoked_at is not None:
        raise HTTPException(status_code=400, detail="Certificate is already revoked.")
    certificate.revoked_at = datetime.now(timezone.utc)
    certificate.revoke_reason = data.reason
    db.commit()
    return _certificate_response(certificate)


@router.get("/certificates/verify/{code}", response_model=CertificateVerifyOut)
def verify_certificate(code: str, db: DBSession = Depends(get_db)):
    certificate = (
        db.query(Certificate)
        .filter(Certificate.code == code.strip().upper())
        .first()
    )
    if certificate is None:
        raise HTTPException(status_code=404, detail="Certificate not found.")
    if certificate.revoked_at is not None:
        return CertificateVerifyOut(valid=False)
    return CertificateVerifyOut(
        valid=True,
        recipient_name=certificate.recipient_name,
        event_title=certificate.event.title,
        category=certificate.category,
        issued_at=certificate.issued_at,
    )


@router.get("/events/{event_id}/certificate-template")
def get_template(event_id: int, db: DBSession = Depends(get_db), admin: User = Depends(admin_only)):
    return {"template": _event_or_404(db, event_id).certificate_template}


@router.put("/events/{event_id}/certificate-template")
def set_template(
    event_id: int,
    data: TemplateUpdate,
    db: DBSession = Depends(get_db),
    admin: User = Depends(admin_only),
):
    event = _event_or_404(db, event_id)
    if data.template is not None and len(json.dumps(data.template)) > 50_000:
        raise HTTPException(status_code=400, detail="Template too large.")
    event.certificate_template = data.template
    db.commit()
    return {"template": event.certificate_template}


@router.post("/certificates/{certificate_id}/reinstate", response_model=CertificateOut)
def reinstate_certificate(
    certificate_id: int,
    db: DBSession = Depends(get_db),
    admin: User = Depends(admin_only),
):
    c = db.get(Certificate, certificate_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Certificate not found.")
    if c.revoked_at is None:
        raise HTTPException(status_code=400, detail="Certificate is not revoked.")
    c.revoked_at = None
    c.revoke_reason = None
    db.commit()
    return _certificate_response(c)
