import base64
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import User

# scrypt from the standard library: memory-hard, and no native bcrypt build to fight on Windows
_N, _R, _P = 2**14, 8, 1


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=_N, r=_R, p=_P)
    b64 = lambda b: base64.b64encode(b).decode()  # noqa: E731
    return f'scrypt${_N}${_R}${_P}${b64(salt)}${b64(digest)}'


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt, digest = stored.split('$')
        if scheme != 'scrypt':
            return False
        expected = base64.b64decode(digest)
        actual = hashlib.scrypt(password.encode(), salt=base64.b64decode(salt), n=int(n), r=int(r), p=int(p))
    except ValueError:
        return False
    return hmac.compare_digest(actual, expected)


# A real hash to check against when the email is unknown, so a login takes as long
# whether or not the account exists
_DUMMY_HASH = hash_password('not-a-real-password-1')


def check_login(user: User | None, password: str) -> bool:
    if user is None:
        verify_password(password, _DUMMY_HASH)
        return False
    return verify_password(password, user.password_hash)


def create_token(user_id: int, remember: bool) -> tuple[str, datetime]:
    lifetime = timedelta(days=settings.remember_me_days) if remember else timedelta(hours=settings.token_hours)
    expires = datetime.now(timezone.utc) + lifetime
    token = jwt.encode({'sub': str(user_id), 'exp': expires}, settings.secret_key, algorithm='HS256')
    return token, expires


_bearer = HTTPBearer(auto_error=False)


def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status.HTTP_401_UNAUTHORIZED, 'Please log in again.', headers={'WWW-Authenticate': 'Bearer'}
    )
    if creds is None:
        raise unauthorized
    try:
        payload = jwt.decode(creds.credentials, settings.secret_key, algorithms=['HS256'])
        user_id = int(payload['sub'])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized
    user = db.get(User, user_id)
    if user is None:
        raise unauthorized
    return user
