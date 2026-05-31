from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import require_auth
from app.auth.jwt import create_token
from app.auth.password import hash_password, verify_password
from app.models.api import LoginRequest, SignupRequest, TokenResponse, UserResponse
from app.models.schema import User
from app.storage.user_store import UserStore

router = APIRouter(prefix="/auth", tags=["auth"])


def _store() -> UserStore:
    return UserStore()


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(body: SignupRequest):
    store = _store()
    if not body.email or "@" not in body.email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if store.email_exists(body.email):
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user = User(email=body.email.lower(), hashed_password=hash_password(body.password))
    store.save_user(user)
    return TokenResponse(access_token=create_token(user.user_id, user.email))


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    store = _store()
    user = store.find_by_email(body.email)
    if user is None or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return TokenResponse(access_token=create_token(user.user_id, user.email))


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(require_auth)):
    return UserResponse(user_id=current_user.user_id, email=current_user.email)
