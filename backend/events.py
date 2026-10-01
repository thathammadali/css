from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_current_user_optional, require_roles
from database import get_db
from models import Event, EventSession, User
from schemas import EventCreate, EventOut, SessionCreate, SessionOut

router = APIRouter(prefix="/events", tags=["events"])


def _is_admin(user: User | None) -> bool:
    return user is not None and user.role.name in ("admin", "super_admin")


@router.post("", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(
    data: EventCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "super_admin")),
):
    event = Event(
        title=data.title,
        description=data.description,
        category=data.category,
        organizer=data.organizer,
        capacity=data.capacity,
        registration_deadline=data.registration_deadline,
        fee_amount=data.fee_amount,
        created_by=user.id,
        status="DRAFT",
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("", response_model=list[EventOut])
def list_events(
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    query = db.query(Event)
    if not _is_admin(user):
        query = query.filter(Event.status != "DRAFT")
    return query.order_by(Event.created_at.desc()).all()


@router.get("/{event_id}", response_model=EventOut)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    event = db.get(Event, event_id)
    if event is None or (event.status == "DRAFT" and not _is_admin(user)):
        raise HTTPException(status_code=404, detail="Event not found.")
    return event


@router.post("/{event_id}/publish", response_model=EventOut)
def publish_event(
    event_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin")),
):
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")
    if event.status != "DRAFT":
        raise HTTPException(status_code=400, detail=f"Event is already '{event.status}', not a draft.")
    event.status = "PUBLISHED"
    db.commit()
    db.refresh(event)
    return event


@router.post("/{event_id}/sessions", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    event_id: int,
    data: SessionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "super_admin")),
):
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")
    if data.ends_at <= data.starts_at:
        raise HTTPException(status_code=400, detail="Session end time must be after the start time.")
    new_session = EventSession(
        event_id=event_id,
        title=data.title,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
        timezone=data.timezone,
        location=data.location,
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session


@router.get("/{event_id}/sessions", response_model=list[SessionOut])
def list_sessions(event_id: int, db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")
    return (
        db.query(EventSession)
        .filter(EventSession.event_id == event_id)
        .order_by(EventSession.starts_at)
        .all()
    )