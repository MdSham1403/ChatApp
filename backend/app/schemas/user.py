from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional

# ── User Preferences Schemas ──────────────────────────────────────────
class PreferencesUpdate(BaseModel):
    chat_bg_type: Optional[str] = None
    chat_bg_value: Optional[str] = None
    bubble_sent: Optional[str] = None
    bubble_received: Optional[str] = None
    font_size: Optional[str] = None
    dark_mode: Optional[bool] = None
    notif_sound: Optional[bool] = None

class PreferencesResponse(BaseModel):
    chat_bg_type: str
    chat_bg_value: Optional[str]
    bubble_sent: str
    bubble_received: str
    font_size: str
    dark_mode: bool
    notif_sound: bool

    model_config = {"from_attributes": True}


# ── Core Authentication Schemas ───────────────────────────────────────
class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str
    display_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None


# ── Profile Data & Transfer Schemas ───────────────────────────────────
class UserResponse(BaseModel):
    id: UUID
    email: str
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    status_message: Optional[str]
    totp_enabled: bool
    public_key: Optional[str]
    
    # Nested Customization Settings
    chat_bg_type: str = "default"
    chat_bg_value: Optional[str] = None
    bubble_sent: str = "#4f46e5"
    bubble_received: str = "#ffffff"
    font_size: str = "md"
    dark_mode: bool = False
    notif_sound: bool = True
    
    created_at: datetime

    model_config = {"from_attributes": True}

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    status_message: Optional[str] = None
    avatar_url: Optional[str] = None
    public_key: Optional[str] = None


# ── Token & Security Validation Schemas ──────────────────────────────
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class TOTPSetupResponse(BaseModel):
    secret: str
    qr_code: str         # base64 PNG

class TOTPVerifyRequest(BaseModel):
    code: str

class RefreshRequest(BaseModel):
    refresh_token: str