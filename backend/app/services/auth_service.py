import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
import pyotp, qrcode, base64, io
from app.models.user import User
from app.config import settings

# ── Password helpers (Pure Native Bcrypt - No Passlib!) ───────────────────────

def hash_password(password: str) -> str:
    """Hashes password cleanly using native bcrypt."""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    """Verifies plain password matches the database string hash securely."""
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

# ── JWT helpers ───────────────────────────────────────────────────────────────

def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(
        {"sub": user_id, "exp": expire, "type": "access"},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )

def create_refresh_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    return jwt.encode(
        {"sub": user_id, "exp": expire, "type": "refresh"},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError:
        return {}

# ── DB helpers ────────────────────────────────────────────────────────────────

async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()

async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()

async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()

# ── Register ──────────────────────────────────────────────────────────────────

async def register_user(db, email, username, password, display_name):
    try:
        if await get_user_by_email(db, email):
            raise ValueError("Email already registered")

        if await get_user_by_username(db, username):
            raise ValueError("Username already taken")

        user = User(
            email=email,
            username=username,
            hashed_password=hash_password(password),
            display_name=display_name or username,
        )

        db.add(user)
        await db.commit()
        await db.refresh(user)

        return user

    except Exception as e:
        print("REGISTER ERROR:", repr(e))
        raise

# ── Login ─────────────────────────────────────────────────────────────────────

async def login_user(db: AsyncSession, email: str,
                     password: str, totp_code: str | None) -> User:
    user = await get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        raise ValueError("Invalid email or password")
    if not user.is_active:
        raise ValueError("Account is disabled")
    if user.totp_enabled:
        if not totp_code:
            raise ValueError("2FA code required")
        if not pyotp.TOTP(user.totp_secret).verify(totp_code, valid_window=1):
            raise ValueError("Invalid 2FA code")
    return user

# ── 2FA setup ─────────────────────────────────────────────────────────────────

def generate_totp_secret() -> str:
    return pyotp.random_base32()

def generate_qr_code(secret: str, email: str) -> str:
    """Returns base64-encoded PNG of the QR code."""
    uri = pyotp.TOTP(secret).provisioning_uri(
        name=email, issuer_name="ChatApp"
    )
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()

async def enable_totp(db: AsyncSession, user: User,
                      secret: str, code: str) -> None:
    if not pyotp.TOTP(secret).verify(code, valid_window=1):
        raise ValueError("Invalid code — scan the QR again")
    user.totp_secret = secret
    user.totp_enabled = True
    await db.commit()

async def disable_totp(db: AsyncSession, user: User, code: str) -> None:
    if not pyotp.TOTP(user.totp_secret).verify(code, valid_window=1):
        raise ValueError("Invalid 2FA code")
    user.totp_secret = None
    user.totp_enabled = False
    await db.commit()