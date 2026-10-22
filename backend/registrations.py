from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from auth import get_current_user, require_roles
from database import get_db
from forms import validate_answers
from models import EventSession, Registration, User
from schemas import (
    AnswersUpdate,
    AttendanceBulk,
    AttendanceUpdate,
    RegistrationCreate,
    RegistrationOut,
)


def to_registration_out(registration: Registration) -> RegistrationOut:
    return RegistrationOut(
        id=registration.id,
        session_id=registration.session_id,
        session_title=registration.session.title,
        event_id=registration.session.event_id,
        event_title=registration.session.event.title,
        user_id=registration.user_id,
        user_full_name=registration.user.full_name,
        user_primary_email=registration.user.primary_email,
        status=registration.status,
        attended=registration.attended,
        answers=registration.answers,
        answers_outdated=(
            registration.answers is not None
            and registration.session.event.form_schema is not None
            and registration.answers_form_version != registration.session.event.form_version
        ),
        edit_count=registration.edit_count,
        answers_updated_at=registration.answers_updated_at,
        receipt_uploaded=registration.receipt_path is not None,
        payment_rejection_reason=registration.payment_rejection_reason,
        created_at=registration.created_at,
    )


router = APIRouter(prefix="/registrations", tags=["registrations"])


@router.post(
    "/sessions/{session_id}",
    response_model=RegistrationOut,
    status_code=status.HTTP_201_CREATED,
)
def register_for_session(
    session_id: int,
    data: RegistrationCreate | None = None,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    event_session = db.get(EventSession, session_id)
    if event_session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    if event_session.event.status != "PUBLISHED":
        raise HTTPException(status_code=400, detail="This event is not open for registration.")

    existing = (
        db.query(Registration)
        .filter(Registration.session_id == session_id, Registration.user_id == user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="You are already registered for this session.")

    now = datetime.now(timezone.utc)
    event = event_session.event
    deadline = event.registration_deadline
    if deadline is not None and now > deadline:
        raise HTTPException(status_code=400, detail="The registration deadline has passed.")
    capacity = event_session.capacity or event.capacity
    if capacity and capacity > 0 and event_session.registered_count >= capacity:
        raise HTTPException(status_code=409, detail="This session is full.")
    answers = None
    if event.form_schema is not None:
        if data is None:
            raise HTTPException(status_code=400, detail="This event requires a registration form.")
        answers = validate_answers(event.form_schema, data.answers)

    initial_status = "CONFIRMED" if event.fee_amount == 0 else "PAYMENT_PENDING"
    registration = Registration(session_id=session_id, user_id=user.id, status=initial_status)
    if answers is not None:
        registration.answers = answers
        registration.answers_form_version = event.form_version
        registration.answers_updated_at = now
    db.add(registration)
    db.commit()
    db.refresh(registration)
    return to_registration_out(registration)


@router.get("/me", response_model=list[RegistrationOut])
def my_registrations(db: DBSession = Depends(get_db), user: User = Depends(get_current_user)):
    return [
        to_registration_out(r)
        for r in db.query(Registration).filter(Registration.user_id == user.id).all()
    ]


@router.get("/{registration_id}", response_model=RegistrationOut)
def get_registration(
    registration_id: int,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    registration = db.get(Registration, registration_id)
    if registration is None:
        raise HTTPException(status_code=404, detail="Registration not found.")
    if registration.user_id != user.id and user.role.name not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="You do not have permission to view this.")
    return to_registration_out(registration)


@router.get("/sessions/{session_id}/all", response_model=list[RegistrationOut])
def list_session_registrations(
    session_id: int,
    db: DBSession = Depends(get_db),
    user: User = Depends(require_roles("admin", "super_admin")),
):
    return [
        to_registration_out(r)
        for r in db.query(Registration).filter(Registration.session_id == session_id).all()
    ]


@router.post("/{registration_id}/cancel", response_model=RegistrationOut)
def cancel_registration(
    registration_id: int,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    registration = db.get(Registration, registration_id)
    if registration is None:
        raise HTTPException(status_code=404, detail="Registration not found.")
    if registration.user_id != user.id:
        raise HTTPException(status_code=403, detail="You can only cancel your own registration.")
    if registration.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="This registration is already cancelled.")
    registration.status = "CANCELLED"
    db.commit()
    db.refresh(registration)
    return to_registration_out(registration)


@router.patch("/{registration_id}/attendance", response_model=RegistrationOut)
def set_attendance(
    registration_id: int,
    data: AttendanceUpdate,
    db: DBSession = Depends(get_db),
    user: User = Depends(require_roles("admin", "super_admin")),
):
    registration = db.get(Registration, registration_id)
    if registration is None:
        raise HTTPException(status_code=404, detail="Registration not found.")
    if data.attended and registration.status != "CONFIRMED":
        raise HTTPException(
            status_code=400,
            detail="Only confirmed registrations can be marked as attended.",
        )
    registration.attended = data.attended
    db.commit()
    db.refresh(registration)
    return to_registration_out(registration)


@router.post("/sessions/{session_id}/attendance", response_model=list[RegistrationOut])
def bulk_set_attendance(
    session_id: int,
    data: AttendanceBulk,
    db: DBSession = Depends(get_db),
    user: User = Depends(require_roles("admin", "super_admin")),
):
    if db.get(EventSession, session_id) is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    registrations = (
        db.query(Registration)
        .filter(
            Registration.session_id == session_id,
            Registration.id.in_(data.registration_ids),
        )
        .all()
    )
    found = {r.id for r in registrations}
    missing = sorted(set(data.registration_ids) - found)
    if missing:
        raise HTTPException(status_code=400, detail=f"Not registrations of this session: {missing}")
    if data.attended:
        unconfirmed = [r.id for r in registrations if r.status != "CONFIRMED"]
        if unconfirmed:
            raise HTTPException(
                status_code=400,
                detail=f"Not confirmed, cannot mark attended: {unconfirmed}",
            )
    for registration in registrations:
        registration.attended = data.attended
    db.commit()
    return [to_registration_out(r) for r in registrations]


@router.put("/{registration_id}/answers", response_model=RegistrationOut)
def update_answers(
    registration_id: int,
    data: AnswersUpdate,
    db: DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    registration = db.get(Registration, registration_id)
    if registration is None:
        raise HTTPException(status_code=404, detail="Registration not found.")
    if registration.user_id != user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own registration.")
    event = registration.session.event
    if event.form_schema is None:
        raise HTTPException(status_code=400, detail="This event has no registration form.")
    if registration.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="This registration is cancelled.")
    if registration.attended:
        raise HTTPException(status_code=400, detail="Answers are locked once attendance is marked.")
    now = datetime.now(timezone.utc)
    if event.registration_deadline is not None and now > event.registration_deadline:
        raise HTTPException(status_code=400, detail="Editing is closed: the registration deadline has passed.")
    clean = validate_answers(event.form_schema, data.answers)
    if registration.answers is not None:
        registration.edit_count += 1
    registration.answers = clean
    registration.answers_form_version = event.form_version
    registration.answers_updated_at = now
    db.commit()
    db.refresh(registration)
    return to_registration_out(registration)
