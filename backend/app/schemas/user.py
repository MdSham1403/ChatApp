from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional

class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str
    display_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None

class UserResponse(BaseModel):
    id: UUID
    email: str
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    status_message: Optional[str]
    totp_enabled: bool
    public_key: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    status_message: Optional[str] = None
    avatar_url: Optional[str] = None
    public_key: Optional[str] = None

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