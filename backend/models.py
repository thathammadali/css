from sqlalchemy import Boolean, Column, Integer, String, Text, Numeric, ForeignKey, DateTime, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import false, func, true
from database import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)  # super_admin, admin, student


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    position_title = Column(String, nullable=True)  # e.g. "President", "VP", "GS", a teacher's name/title
    roll_number = Column(String, nullable=True)
    department = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    institution = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, server_default=true())
    primary_email = Column(String, unique=True, nullable=False, index=True)
    secondary_email = Column(String, unique=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    role = relationship("Role")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    category = Column(String)
    organizer = Column(String)
    status = Column(String, nullable=False, default="DRAFT")  # DRAFT, PUBLISHED, UPCOMING, ...
    form_schema = Column(JSON(none_as_null=True), nullable=True)
    form_version = Column(Integer, nullable=False, default=0, server_default="0")
    location_type = Column(String, nullable=True)  # on_campus, virtual, hybrid
    certificate_template = Column(JSON(none_as_null=True), nullable=True)

    @property
    def has_form(self) -> bool:
        return self.form_schema is not None

    capacity = Column(Integer, nullable=True)
    registration_deadline = Column(DateTime(timezone=True), nullable=True)
    fee_amount = Column(Numeric(10, 2), nullable=False, default=0)  # 0 = free event
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sessions = relationship("EventSession", back_populates="event", cascade="all, delete-orphan")


class EventSession(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    title = Column(String, nullable=False)
    starts_at = Column(DateTime(timezone=True), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=False)
    timezone = Column(String, nullable=False, default="Asia/Karachi")
    location = Column(String)  # room or meeting link
    capacity = Column(Integer, nullable=True)  # falls back to Event.capacity if not set
    meeting_link = Column(String, nullable=True)
    speaker = Column(String, nullable=True)
    meeting_links = Column(JSON(none_as_null=True), nullable=True)

    registrations = relationship("Registration", viewonly=True)

    event = relationship("Event", back_populates="sessions")

    @property
    def registered_count(self) -> int:
        return sum(1 for r in self.registrations if r.status in ("CONFIRMED", "PAYMENT_PENDING"))


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    deadline = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("EventSession", backref="assignments")


class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"
    __table_args__ = (
        UniqueConstraint("assignment_id", "user_id", name="uq_assignment_user_submission"),
    )

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_path = Column(String, nullable=False)
    is_late = Column(Boolean, default=False, nullable=False)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    assignment = relationship("Assignment", backref="submissions")
    user = relationship("User")


class Registration(Base):
    __tablename__ = "registrations"
    __table_args__ = (UniqueConstraint("session_id", "user_id", name="uq_session_user"),)

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, nullable=False, default="SUBMITTED")
    receipt_path = Column(String, nullable=True)
    payment_rejection_reason = Column(String, nullable=True)
    answers = Column(JSON(none_as_null=True), nullable=True)
    answers_form_version = Column(Integer, nullable=True)
    edit_count = Column(Integer, nullable=False, default=0, server_default="0")
    answers_updated_at = Column(DateTime(timezone=True), nullable=True)
    attended = Column(Boolean, nullable=False, default=False, server_default=false())
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    session = relationship("EventSession")
    user = relationship("User", foreign_keys=[user_id])

    @property
    def session_title(self) -> str:
        return self.session.title

    @property
    def event_id(self) -> int:
        return self.session.event_id

    @property
    def event_title(self) -> str:
        return self.session.event.title

    @property
    def user_full_name(self) -> str:
        return self.user.full_name

    @property
    def user_primary_email(self) -> str:
        return self.user.primary_email


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    recipient_name = Column(String, nullable=False)
    status_tag = Column(String, nullable=True)
    student_id = Column(String, nullable=True)
    category = Column(String, nullable=True)
    issued_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revoke_reason = Column(String, nullable=True)

    event = relationship("Event")

    @property
    def event_title(self) -> str:
        return self.event.title

    @property
    def is_valid(self) -> bool:
        return self.revoked_at is None