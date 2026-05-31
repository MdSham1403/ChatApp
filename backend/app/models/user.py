import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    # Core Identifiers & Credentials
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    
    # Profile Information
    display_name = Column(String(100), nullable=True)
    avatar_url = Column(Text, nullable=True)
    status_message = Column(String(150), nullable=True)
    is_active = Column(Boolean, default=True)
    is_online = Column(Boolean, default=False)

    # 2FA Settings
    totp_secret = Column(String(64), nullable=True)
    totp_enabled = Column(Boolean, default=False)

    # E2E Encryption Public Key
    # (Stored on server, private key never leaves the client device)
    public_key = Column(Text, nullable=True)

    # ── Appended User Customization Preferences (Step 3) ─────────────────
    chat_bg_type = Column(String(20), default="default")
    # Valid options: "default" | "color" | "gradient" | "image"
    
    chat_bg_value = Column(String(500), nullable=True)
    # Stores hex color / gradient layout tokens / asset image URLs
    
    bubble_sent = Column(String(20), default="#4f46e5")
    bubble_received = Column(String(20), default="#ffffff")
    
    font_size = Column(String(10), default="md")
    # Valid options: "sm" | "md" | "lg"
    
    dark_mode = Column(Boolean, default=False)
    notif_sound = Column(Boolean, default=True)
    # ─────────────────────────────────────────────────────────────────────

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())