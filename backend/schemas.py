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