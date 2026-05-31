from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from app.auth.jwt import decode_token
from app.models.schema import User
from app.storage.user_store import UserStore

_bearer = HTTPBearer(auto_error=False)


def _store() -> UserStore:
    return UserStore()


def get_optional_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> User | None:
    """Return the current user if a valid token is provided, else None."""
    if creds is None:
        return None
    try:
        payload = decode_token(creds.credentials)
        user_id: str = payload["sub"]
        return _store().load_user(user_id)
    except (JWTError, KeyError, FileNotFoundError):
        return None


def require_auth(user: User | None = Depends(get_optional_user)) -> User:
    """Raise 401 if no valid token is provided."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
