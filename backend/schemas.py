from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class SignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    primary_email: EmailStr
    secondary_email: EmailStr | None = None
    position_title: str | None = None
    password: str = Field(min_length=8)

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Please enter your full name")
        return v

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password is too long (72 bytes max)")
        return v


class UserOut(BaseModel):
    id: int
    full_name: str
    primary_email: str
    secondary_email: str | None = None
    position_title: str | None = None
    role: str


class ProfileUpdate(BaseModel):
    position_title: str | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class EventCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = None
    category: str | None = None
    organizer: str | None = None
    capacity: int | None = None
    registration_deadline: datetime | None = None
    fee_amount: Decimal = Decimal("0")


class EventOut(BaseModel):
    id: int
    title: str
    description: str | None
    category: str | None
    organizer: str | None
    status: str
    has_form: bool = False
    form_version: int = 0
    capacity: int | None
    registration_deadline: datetime | None
    fee_amount: Decimal
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class SessionCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    starts_at: datetime
    ends_at: datetime
    timezone: str = "Asia/Karachi"
    location: str | None = None
    capacity: int | None = None
    meeting_link: str | None = None
    speaker: str | None = Field(default=None, max_length=200)

    @field_validator("meeting_link")
    @classmethod
    def link_must_be_http(cls, v: str | None) -> str | None:
        if v and not v.startswith(("http://", "https://")):
            raise ValueError("Meeting link must start with http:// or https://")
        return v


class SessionOut(BaseModel):
    id: int
    event_id: int
    title: str
    starts_at: datetime
    ends_at: datetime
    timezone: str
    location: str | None
    capacity: int | None
    meeting_link: str | None = None
    speaker: str | None = None
    registered_count: int = 0

    class Config:
        from_attributes = True


class AssignmentCreate(BaseModel):
    title: str
    description: str | None = None
    deadline: datetime


class AssignmentOut(BaseModel):
    id: int
    session_id: int
    title: str
    description: str | None
    deadline: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class AssignmentSubmissionOut(BaseModel):
    id: int
    assignment_id: int
    user_id: int
    user_full_name: str
    user_primary_email: str
    is_late: bool
    submitted_at: datetime


class RegistrationOut(BaseModel):
    id: int
    session_id: int
    session_title: str
    event_id: int
    event_title: str
    user_id: int
    user_full_name: str
    user_primary_email: str
    status: str
    attended: bool = False
    answers: dict | None = None
    answers_outdated: bool = False
    edit_count: int = 0
    answers_updated_at: datetime | None = None
    receipt_uploaded: bool = False
    payment_rejection_reason: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentReject(BaseModel):
    reason: str = Field(min_length=3, max_length=300)


class AttendanceUpdate(BaseModel):
    attended: bool


class AttendanceBulk(BaseModel):
    registration_ids: list[int] = Field(min_length=1, max_length=500)
    attended: bool = True


AnswerValue = str | int | float | bool | None


class FormField(BaseModel):
    key: str = Field(pattern=r"^[a-z][a-z0-9_]{0,39}$")
    label: str = Field(min_length=1, max_length=200)
    type: Literal["text", "long_text", "number", "dropdown", "checkbox"]
    required: bool = False
    options: list[str] | None = None

    @model_validator(mode="after")
    def check_options(self):
        if self.type == "dropdown":
            if not self.options or len(set(self.options)) != len(self.options):
                raise ValueError("Dropdown needs a non-empty list of unique options")
        elif self.options:
            raise ValueError("Only dropdown fields can have options")
        return self


class FormSchema(BaseModel):
    fields: list[FormField] = Field(min_length=1, max_length=30)

    @model_validator(mode="after")
    def unique_keys(self):
        keys = [field.key for field in self.fields]
        if len(keys) != len(set(keys)):
            raise ValueError("Field keys must be unique")
        return self


class FormUpdate(BaseModel):
    form: FormSchema | None = None
    on_existing: Literal["keep", "delete"] = "keep"


class FormOut(BaseModel):
    form: FormSchema | None
    form_version: int


class RegistrationCreate(BaseModel):
    answers: dict[str, AnswerValue] = {}


class AnswersUpdate(BaseModel):
    answers: dict[str, AnswerValue]