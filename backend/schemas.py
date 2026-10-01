from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field, field_validator


class SignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    primary_email: EmailStr
    secondary_email: EmailStr | None = None
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
    role: str


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


class SessionOut(BaseModel):
    id: int
    event_id: int
    title: str
    starts_at: datetime
    ends_at: datetime
    timezone: str
    location: str | None

    class Config:
        from_attributes = True