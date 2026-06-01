from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.user import (
    UserRegister, UserLogin, TokenResponse,
    TOTPSetupResponse, TOTPVerifyRequest, RefreshRequest,
)
from app.services import auth_service
from app.services.jwt_bearer import get_current_user
from app.services.crypto_service import generate_keypair
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: UserRegister, db: AsyncSession = Depends(get_db)):
    print(body.model_dump())

    # ADD these two checks
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if len(body.password) > 1024:
        raise HTTPException(status_code=400, detail="Password too long")

    try:
        user = await auth_service.register_user(
            db,
            body.email,
            body.username,
            body.password,
            body.display_name
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
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    return TokenResponse(
        access_token=auth_service.create_access_token(str(user.id)),
        refresh_token=auth_service.create_refresh_token(str(user.id)),
        user=user,
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = auth_service.decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = await auth_service.get_user_by_id(db, payload["sub"])
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return TokenResponse(
        access_token=auth_service.create_access_token(str(user.id)),
        refresh_token=auth_service.create_refresh_token(str(user.id)),
        user=user,
    )

@router.post("/2fa/setup", response_model=TOTPSetupResponse)
async def setup_2fa(current_user: User = Depends(get_current_user)):
    if current_user.totp_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA already enabled")
    secret = auth_service.generate_totp_secret()
    qr = auth_service.generate_qr_code(secret, current_user.email)
    return TOTPSetupResponse(secret=secret, qr_code=qr)

@router.post("/2fa/confirm")
async def confirm_2fa(
    body: TOTPVerifyRequest,   # Reused Pydantic schema for type-safe validation
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Confirm and activate 2FA using the secret key and code from the authenticator app.
    """
    try:
        # Assuming TOTPVerifyRequest contains both token/code and setup secret variables
        await auth_service.enable_totp(
            db, current_user, body.secret, body.code
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {"message": "2FA disabled"}

@router.post("/keys/generate")
async def generate_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a fresh NaCl keypair for this user.
    Public key is saved to DB.
    Private key is returned ONCE — client must store it locally.
    Never call this if the user already has keys (messages become unreadable).
    """
    if current_user.public_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Keys already exist. Regenerating breaks existing messages."
        )
    public_key, private_key = generate_keypair()
    current_user.public_key = public_key
    
    await db.commit()
    await db.refresh(current_user) # Safely refresh async session tracking state
    
    return {
        "public_key": public_key,
        "private_key": private_key,
        "warning": "Save your private key securely. It cannot be recovered."
    }

@router.get("/keys/public/{user_id}")
async def get_public_key(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch another user's public key before sending them an encrypted message."""
    user = await auth_service.get_user_by_id(db, user_id)
    if not user or not user.public_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Public key not found")
    return {"user_id": user_id, "public_key": user.public_key}