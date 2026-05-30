from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.user import (
    UserRegister, UserLogin, TokenResponse,
    TOTPSetupResponse, TOTPVerifyRequest, RefreshRequest,
)
from app.services import auth_service
from app.services.jwt_bearer import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: UserRegister, db: AsyncSession = Depends(get_db)):
    try:
        user = await auth_service.register_user(
            db, body.email, body.username, body.password, body.display_name
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return TokenResponse(
        access_token=auth_service.create_access_token(str(user.id)),
        refresh_token=auth_service.create_refresh_token(str(user.id)),
        user=user,
    )

@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    try:
        user = await auth_service.login_user(
            db, body.email, body.password, body.totp_code
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    return TokenResponse(
        access_token=auth_service.create_access_token(str(user.id)),
        refresh_token=auth_service.create_refresh_token(str(user.id)),
        user=user,
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = auth_service.decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = await auth_service.get_user_by_id(db, payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return TokenResponse(
        access_token=auth_service.create_access_token(str(user.id)),
        refresh_token=auth_service.create_refresh_token(str(user.id)),
        user=user,
    )

@router.post("/2fa/setup", response_model=TOTPSetupResponse)
async def setup_2fa(current_user: User = Depends(get_current_user)):
    if current_user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA already enabled")
    secret = auth_service.generate_totp_secret()
    qr = auth_service.generate_qr_code(secret, current_user.email)
    return TOTPSetupResponse(secret=secret, qr_code=qr)

@router.post("/2fa/enable")
async def enable_2fa(
    body: TOTPVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Frontend must send back the secret from /2fa/setup + the code from authenticator app
    # We receive secret in the body for the first-time setup flow
    raise HTTPException(status_code=400, detail="Send secret + code via /2fa/confirm")

@router.post("/2fa/confirm")
async def confirm_2fa(
    body: dict,   # {secret: str, code: str}
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        await auth_service.enable_totp(
            db, current_user, body["secret"], body["code"]
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "2FA enabled successfully"}

@router.post("/2fa/disable")
async def disable_2fa(
    body: TOTPVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        await auth_service.disable_totp(db, current_user, body.code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "2FA disabled"}