from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import Role, User
from schemas import SignupRequest, TokenOut, UserOut
from security import create_access_token, decode_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_current_user_optional(
    token: str | None = Depends(optional_oauth2_scheme), db: Session = Depends(get_db)
) -> User | None:
    if token is None:
        return None
    user_id = decode_access_token(token)
    if user_id is None:
        return None
    return db.get(User, user_id)


def to_user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        full_name=user.full_name,
        primary_email=user.primary_email,
        secondary_email=user.secondary_email,
        role=user.role.name,
    )


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    user_id = decode_access_token(token)
    if user_id is None:
        raise error
    user = db.get(User, user_id)
    if user is None:
        raise error
    return user


def require_roles(*allowed: str):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role.name not in allowed:
            raise HTTPException(status_code=403, detail="You do not have permission to do this.")
        return user

    return checker


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    primary_email = data.primary_email.lower()
    secondary_email = data.secondary_email.lower() if data.secondary_email else None

    if db.query(User).filter(User.primary_email == primary_email).first():
        raise HTTPException(status_code=409, detail="This email is already registered.")
    if secondary_email and db.query(User).filter(User.secondary_email == secondary_email).first():
        raise HTTPException(status_code=409, detail="This secondary email is already in use.")

    student_role = db.query(Role).filter(Role.name == "student").first()
    if student_role is None:
        raise HTTPException(status_code=500, detail="Server setup incomplete: roles are missing.")

    user = User(
        full_name=data.full_name,
        primary_email=primary_email,
        secondary_email=secondary_email,
        hashed_password=hash_password(data.password),
        role_id=student_role.id,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This email is already registered.")
    db.refresh(user)
    return to_user_out(user)


@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    email = form.username.strip().lower()
    user = (
        db.query(User)
        .filter((User.primary_email == email) | (User.secondary_email == email))
        .first()
    )
    if user is None or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenOut(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return to_user_out(user)
