from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum
from app.db.database import Base

class MediaType(str, enum.Enum):
    image    = "image"
    video    = "video"
    audio    = "audio"
    file     = "file"

class Media(Base):
    __tablename__ = "media"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    uploader_id  = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    media_type   = Column(Enum(MediaType), nullable=False)
    url          = Column(String(500), nullable=False)
    public_id    = Column(String(255), nullable=True)   # Cloudinary public_id
    filename     = Column(String(255), nullable=True)
    size_bytes   = Column(Integer, nullable=True)
    mime_type    = Column(String(100), nullable=True)
    width        = Column(Integer, nullable=True)       # images/video
    height       = Column(Integer, nullable=True)
    duration     = Column(Integer, nullable=True)       # audio/video seconds
    created_at   = Column(DateTime(timezone=True), server_default=func.now())