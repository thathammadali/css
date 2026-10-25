from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_
from sqlalchemy.orm import Session

from auth import get_current_user_optional, require_roles
from database import get_db
from models import Event, EventSession, Registration, User
from schemas import EventCreate, EventOut, EventUpdate, SessionCreate, SessionOut, SessionUpdate

router = APIRouter(prefix="/events", tags=["events"])


def _is_admin(user: User | None) -> bool:
    return user is not None and user.role.name in ("admin", "super_admin")


def _links_payload(links, legacy):
    """Returns (links_json, primary_url). meeting_links wins over the legacy single field."""
    if links is not None:
        dumped = [l.model_dump() for l in links]
        return (dumped or None), (dumped[0]["url"] if dumped else None)
    if legacy:
        return [{"platform": "other", "label": None, "url": legacy, "public": False}], legacy
    return None, None


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
        location_type=data.location_type,
        created_by=user.id,
        status="DRAFT",
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("", response_model=list[EventOut])
def list_events(
    category: str | None = None,
    location_type: str | None = None,
    is_free: bool | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    pkt = timezone(timedelta(hours=5))
    query = db.query(Event)
    if not _is_admin(user):
        query = query.filter(Event.status != "DRAFT")
    if category:
        query = query.filter(Event.category == category)
    if location_type:
        query = query.filter(Event.location_type == location_type)
    if is_free is True:
        query = query.filter(Event.fee_amount == 0)
    elif is_free is False:
        query = query.filter(Event.fee_amount > 0)
    if date_from or date_to:
        conditions = []
        if date_from:
            conditions.append(EventSession.ends_at >= datetime.combine(date_from, time.min, tzinfo=pkt))
        if date_to:
            conditions.append(
                EventSession.starts_at
                < datetime.combine(date_to + timedelta(days=1), time.min, tzinfo=pkt)
            )
        query = query.filter(Event.sessions.any(and_(*conditions)))
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
    links, primary = _links_payload(data.meeting_links, data.meeting_link)
    new_session = EventSession(
        event_id=event_id,
        title=data.title,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
        timezone=data.timezone,
        location=data.location,
        capacity=data.capacity,
        meeting_link=primary,
        meeting_links=links,
        speaker=data.speaker,
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session


@router.get("/{event_id}/sessions", response_model=list[SessionOut])
def list_sessions(
    event_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    event = db.get(Event, event_id)
    if event is None or (event.status == "DRAFT" and not _is_admin(user)):
        raise HTTPException(status_code=404, detail="Event not found.")
    sessions = (
        db.query(EventSession)
        .filter(EventSession.event_id == event_id)
        .order_by(EventSession.starts_at)
        .all()
    )
    admin = _is_admin(user)
    confirmed_ids = set()
    if user is not None and not admin and sessions:
        confirmed_ids = {
            sid
            for (sid,) in db.query(Registration.session_id).filter(
                Registration.user_id == user.id,
                Registration.status == "CONFIRMED",
                Registration.session_id.in_([s.id for s in sessions]),
            )
        }
    result = []
    for s in sessions:
        out = SessionOut.model_validate(s)
        if not admin and s.id not in confirmed_ids:
            out.meeting_link = None
            out.meeting_links = [link for link in out.meeting_links if link.public]
        result.append(out)
    return result


@router.patch("/{event_id}", response_model=EventOut)
def update_event(
    event_id: int,
    data: EventUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "super_admin")),
):
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")
    for field, value in data.model_dump(exclude_unset=True).items():
        if field in ("title", "fee_amount") and value is None:
            raise HTTPException(status_code=400, detail=f"{field} cannot be empty.")
        setattr(event, field, value)
    db.commit()
    db.refresh(event)
    return event


@router.patch("/{event_id}/sessions/{session_id}", response_model=SessionOut)
def update_session(
    event_id: int,
    session_id: int,
    data: SessionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "super_admin")),
):
    event_session = db.get(EventSession, session_id)
    if event_session is None or event_session.event_id != event_id:
        raise HTTPException(status_code=404, detail="Session not found.")
    changes = data.model_dump(exclude_unset=True)
    for field in ("title", "starts_at", "ends_at", "timezone"):
        if field in changes and changes[field] is None:
            raise HTTPException(status_code=400, detail=f"{field} cannot be empty.")
    for field, value in changes.items():
        setattr(event_session, field, value)
    if "meeting_links" in changes:
        links = changes["meeting_links"] or []
        event_session.meeting_links = links or None
        event_session.meeting_link = links[0]["url"] if links else None
    elif "meeting_link" in changes:
        legacy = changes["meeting_link"]
        event_session.meeting_links = (
            [{"platform": "other", "label": None, "url": legacy, "public": False}] if legacy else None
        )
    if event_session.ends_at <= event_session.starts_at:
        db.rollback()
        raise HTTPException(status_code=400, detail="Session end time must be after the start time.")
    if event_session.capacity and event_session.capacity < event_session.registered_count:
        db.rollback()
        raise HTTPException(status_code=400, detail="Capacity cannot be lower than the current registrations.")
    db.commit()
    db.refresh(event_session)
    return event_session