from datetime import datetime
from decimal import Decimal
import re
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


LocationType = Literal["on_campus", "virtual", "hybrid"]
ROLL_NUMBER_PATTERN = r"^[0-9]{3,15}$"


def _clean_text(value: str | None, *, empty_to_none: bool = False) -> str | None:
    if value is None:
        return None
    if any(ord(char) < 32 and char not in "\t\n\r" for char in value):
        raise ValueError("Please remove unsupported control characters.")
    cleaned = value.strip()
    return None if empty_to_none and not cleaned else cleaned


class SignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    primary_email: EmailStr
    secondary_email: EmailStr | None = None
    position_title: str | None = None
    password: str = Field(min_length=8)

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = _clean_text(v) or ""
        if len(v) < 2:
            raise ValueError("Please enter your full name (letters only, at least 2 characters).")
        if not any(char.isalpha() for char in v):
            raise ValueError("Please enter your full name (letters only, at least 2 characters).")
        return v

    @model_validator(mode="after")
    def secondary_differs(self):
        if self.secondary_email and self.secondary_email.casefold() == self.primary_email.casefold():
            raise ValueError("Secondary email must differ from the primary email.")
        return self

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password is too long. Please use 72 characters or fewer.")
        return v


class UserOut(BaseModel):
    id: int
    full_name: str
    primary_email: str
    secondary_email: str | None = None
    position_title: str | None = None
    roll_number: str | None = None
    department: str | None = None
    phone: str | None = None
    institution: str | None = None
    is_active: bool = True
    role: str


class ProfileUpdate(BaseModel):
    position_title: str | None = Field(default=None, max_length=100)
    roll_number: str | None = Field(default=None)
    department: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None)
    institution: str | None = Field(default=None, max_length=150)

    @field_validator("position_title", "roll_number", "department", "phone", "institution", mode="before")
    @classmethod
    def clean_profile_text(cls, value):
        return _clean_text(value, empty_to_none=True)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value):
        if value is not None:
            normalized = value.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
            if not re.fullmatch(r"[0-9]{11}", normalized):
                raise ValueError("Phone number must be 11 digits, for example 03001234567.")
            return normalized
        return value

    @field_validator("roll_number")
    @classmethod
    def validate_roll_number(cls, value):
        if value is not None and not re.fullmatch(ROLL_NUMBER_PATTERN, value):
            raise ValueError("Roll number must be 3 to 15 digits, for example 24004376045.")
        return value


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


ACCOUNT_NUMBER_PATTERN = re.compile(r"^[A-Za-z0-9 -]+$")


def _clean_payment_text(value: str | None) -> str | None:
    return _clean_text(value, empty_to_none=True)


def _clean_account_number(value: str | None) -> str | None:
    cleaned = _clean_payment_text(value)
    if cleaned is not None and not ACCOUNT_NUMBER_PATTERN.match(cleaned):
        raise ValueError("Account number can only contain letters, digits, spaces and dashes.")
    return cleaned


def check_payment_details(fee_amount: Decimal | None, account_title: str | None, account_number: str | None) -> None:
    if fee_amount is not None and fee_amount > 0:
        if not account_title:
            raise ValueError("Please enter the account title where students should send payment.")
        if not account_number:
            raise ValueError("Please enter the account number where students should send payment.")


class PaymentDetailsMixin(BaseModel):
    payment_method: str | None = Field(default=None, max_length=50)
    account_title: str | None = Field(default=None, max_length=100)
    account_number: str | None = Field(default=None, max_length=34)
    payment_instructions: str | None = Field(default=None, max_length=500)

    @field_validator("payment_method", "account_title", "payment_instructions")
    @classmethod
    def trim_payment_text(cls, v: str | None) -> str | None:
        return _clean_payment_text(v)

    @field_validator("account_number")
    @classmethod
    def validate_account_number(cls, v: str | None) -> str | None:
        return _clean_account_number(v)


class EventCreate(PaymentDetailsMixin):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    category: str | None = Field(default=None, max_length=100)
    organizer: str | None = Field(default=None, max_length=200)
    capacity: int | None = Field(default=None, ge=1, le=100000)
    registration_deadline: datetime | None = None
    fee_amount: Decimal = Field(default=Decimal("0"), ge=0, le=1000000, decimal_places=2)
    location_type: LocationType | None = None

    @model_validator(mode="after")
    def payment_details_for_paid_events(self):
        check_payment_details(self.fee_amount, self.account_title, self.account_number)
        if self.fee_amount == 0:
            self.payment_method = self.account_title = self.account_number = self.payment_instructions = None
        return self


class EventOut(BaseModel):
    id: int
    title: str
    description: str | None
    category: str | None
    organizer: str | None
    status: str
    has_form: bool = False
    form_version: int = 0
    location_type: str | None = None
    capacity: int | None
    registration_deadline: datetime | None
    fee_amount: Decimal
    payment_method: str | None = None
    account_title: str | None = None
    account_number: str | None = None
    payment_instructions: str | None = None
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class MeetingLink(BaseModel):
    platform: Literal["zoom", "meet", "youtube", "teams", "other"] = "other"
    label: str | None = Field(default=None, max_length=60)
    url: str = Field(max_length=500)
    public: bool = False

    @field_validator("url")
    @classmethod
    def url_must_be_http(cls, v):
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("Link must start with http:// or https://")
        return v

    @model_validator(mode="after")
    def detect_platform(self):
        if self.platform == "other":
            u = self.url.lower()
            if "zoom.us" in u:
                self.platform = "zoom"
            elif "meet.google.com" in u:
                self.platform = "meet"
            elif "youtube.com" in u or "youtu.be" in u:
                self.platform = "youtube"
            elif "teams.microsoft.com" in u or "teams.live.com" in u:
                self.platform = "teams"
        return self


class SessionCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    starts_at: datetime
    ends_at: datetime
    timezone: str = "Asia/Karachi"
    location: str | None = Field(default=None, max_length=200)
    capacity: int | None = Field(default=None, ge=1, le=100000)
    meeting_link: str | None = Field(default=None, max_length=500)
    meeting_links: list[MeetingLink] | None = Field(default=None, max_length=5)
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
    meeting_links: list[MeetingLink] = Field(default_factory=list)
    speaker: str | None = None
    registered_count: int = 0

    @field_validator("meeting_links", mode="before")
    @classmethod
    def none_to_empty(cls, v):
        return v or []

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


class EventUpdate(PaymentDetailsMixin):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    category: str | None = Field(default=None, max_length=100)
    organizer: str | None = Field(default=None, max_length=200)
    capacity: int | None = Field(default=None, ge=1, le=100000)
    registration_deadline: datetime | None = None
    fee_amount: Decimal | None = Field(default=None, ge=0, le=1000000, decimal_places=2)
    location_type: LocationType | None = None


class SessionUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    timezone: str | None = None
    location: str | None = Field(default=None, max_length=200)
    capacity: int | None = Field(default=None, ge=1, le=100000)
    meeting_link: str | None = Field(default=None, max_length=500)
    meeting_links: list[MeetingLink] | None = Field(default=None, max_length=5)
    speaker: str | None = Field(default=None, max_length=200)

    @field_validator("meeting_link")
    @classmethod
    def link_must_be_http(cls, v: str | None) -> str | None:
        if v and not v.startswith(("http://", "https://")):
            raise ValueError("Meeting link must start with http:// or https://")
        return v


class RoleUpdate(BaseModel):
    role: Literal["student", "admin", "super_admin"]


class StatusUpdate(BaseModel):
    is_active: bool


class CertificateIssue(BaseModel):
    user_ids: list[int] | None = Field(default=None, max_length=500)
    category: str | None = Field(default=None, max_length=100)


class CertificateRevoke(BaseModel):
    reason: str = Field(min_length=3, max_length=300)


class CertificateOut(BaseModel):
    id: int
    code: str
    event_id: int
    event_title: str
    user_id: int | None
    recipient_name: str
    recipient_roll: str | None = None
    status_tag: str | None
    student_id: str | None
    category: str | None
    issued_at: datetime
    is_valid: bool
    revoked_at: datetime | None
    revoke_reason: str | None

    class Config:
        from_attributes = True


class CertificateVerifyOut(BaseModel):
    valid: bool
    recipient_name: str | None = None
    event_title: str | None = None
    category: str | None = None
    issued_at: datetime | None = None


class TemplateUpdate(BaseModel):
    template: dict | None