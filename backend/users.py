from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session as DBSession

from auth import require_roles, to_user_out
from database import get_db
from models import Role, User
from schemas import RoleUpdate, StatusUpdate, UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(
    q: str | None = None,
    role: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: DBSession = Depends(get_db),
    actor: User = Depends(require_roles("admin", "super_admin")),
):
    query = db.query(User)
    if q:
        like = f"%{q.strip().lower()}%"
        query = query.filter(
            or_(func.lower(User.full_name).like(like), User.primary_email.like(like))
        )
    if role:
        query = query.join(Role, User.role_id == Role.id).filter(Role.name == role)
    return [
        to_user_out(user)
        for user in query.order_by(User.id).offset(offset).limit(limit).all()
    ]


@router.patch("/{user_id}/role", response_model=UserOut)
def set_role(
    user_id: int,
    data: RoleUpdate,
    db: DBSession = Depends(get_db),
    actor: User = Depends(require_roles("super_admin")),
):
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if target.id == actor.id:
        raise HTTPException(status_code=400, detail="You cannot change your own role.")
    role = db.query(Role).filter(Role.name == data.role).first()
    if role is None:
        raise HTTPException(status_code=400, detail="Unknown role.")
    target.role_id = role.id
    db.commit()
    db.refresh(target)
    return to_user_out(target)


@router.patch("/{user_id}/status", response_model=UserOut)
def set_status(
    user_id: int,
    data: StatusUpdate,
    db: DBSession = Depends(get_db),
    actor: User = Depends(require_roles("admin", "super_admin")),
):
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if target.id == actor.id:
        raise HTTPException(status_code=400, detail="You cannot change your own status.")
    if target.role.name != "student" and actor.role.name != "super_admin":
        raise HTTPException(status_code=403, detail="Only a super admin can change an admin's status.")
    target.is_active = data.is_active
    db.commit()
    db.refresh(target)
    return to_user_out(target)
