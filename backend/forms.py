from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from auth import get_current_user_optional, require_roles
from database import get_db
from events import _is_admin
from models import Event, EventSession, Registration, User
from schemas import FormOut, FormUpdate

router = APIRouter(prefix="/events", tags=["forms"])


def validate_answers(form_schema: dict, answers: dict) -> dict:
    fields = {field["key"]: field for field in form_schema["fields"]}
    errors = []
    unknown = sorted(set(answers) - set(fields))
    if unknown:
        errors.append(f"Unknown fields: {unknown}")
    clean = {}
    for key, field in fields.items():
        value = answers.get(key)
        label = field["label"]
        kind = field["type"]
        if kind == "checkbox":
            value = bool(value) if value is not None else False
            if field["required"] and not value:
                errors.append(f"'{label}' must be checked")
            clean[key] = value
            continue
        if value is None or value == "":
            if field["required"]:
                errors.append(f"'{label}' is required")
            continue
        if kind in ("text", "long_text"):
            limit = 200 if kind == "text" else 2000
            if not isinstance(value, str) or len(value) > limit:
                errors.append(f"'{label}' must be text up to {limit} characters")
                continue
        elif kind == "number":
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                errors.append(f"'{label}' must be a number")
                continue
        elif kind == "dropdown":
            if value not in (field.get("options") or []):
                errors.append(f"'{label}' must be one of the listed options")
                continue
        clean[key] = value
    if errors:
        raise HTTPException(status_code=400, detail="; ".join(errors))
    return clean


@router.get("/{event_id}/form", response_model=FormOut)
def get_form(
    event_id: int,
    db: DBSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    event = db.get(Event, event_id)
    if event is None or (event.status == "DRAFT" and not _is_admin(user)):
        raise HTTPException(status_code=404, detail="Event not found.")
    return FormOut(form=event.form_schema, form_version=event.form_version)


@router.put("/{event_id}/form", response_model=FormOut)
def set_form(
    event_id: int,
    data: FormUpdate,
    db: DBSession = Depends(get_db),
    user: User = Depends(require_roles("admin", "super_admin")),
):
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")
    new_schema = data.form.model_dump() if data.form else None
    if new_schema == event.form_schema:
        return FormOut(form=event.form_schema, form_version=event.form_version)
    if data.on_existing == "delete":
        registrations = (
            db.query(Registration)
            .join(EventSession, Registration.session_id == EventSession.id)
            .filter(EventSession.event_id == event_id, Registration.answers.isnot(None))
            .all()
        )
        for registration in registrations:
            registration.answers = None
            registration.answers_form_version = None
            registration.answers_updated_at = None
            registration.edit_count = 0
    event.form_schema = new_schema
    event.form_version += 1
    db.commit()
    db.refresh(event)
    return FormOut(form=event.form_schema, form_version=event.form_version)
