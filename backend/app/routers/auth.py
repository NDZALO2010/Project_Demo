from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..schemas import LoginIn, RegisterIn, TokenOut, UserOut, iso
from ..security import check_login, create_token, current_user, hash_password

router = APIRouter(prefix='/auth', tags=['auth'])


def user_out(user: User) -> UserOut:
    return UserOut(id=user.id, email=user.email, full_name=user.full_name, phone=user.phone, role=user.role)


@router.post('/register', status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn, db: Session = Depends(get_db)) -> UserOut:
    user = User(
        email=body.email.lower(),
        full_name=body.full_name,
        phone=body.phone,
        role=body.role,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, 'There is already an account with that email. Try logging in.')
    return user_out(user)


@router.post('/login')
def login(body: LoginIn, db: Session = Depends(get_db)) -> TokenOut:
    user = db.scalar(select(User).where(func.lower(User.email) == body.email.lower()))
    if not check_login(user, body.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "That email and password don't match.")
    token, expires = create_token(user.id, body.remember)
    return TokenOut(access_token=token, expires_at=iso(expires), user=user_out(user))


@router.get('/me')
def me(user: User = Depends(current_user)) -> UserOut:
    return user_out(user)
