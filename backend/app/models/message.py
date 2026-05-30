from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from app.db.database import Base

class MessageStatus(str, enum.Enum):
    sent      = "sent"
    delivered = "delivered"
    read      = "read"
    deleted   = "deleted"

class MessageType(str, enum.Enum):
    text  = "text"
    image = "image"
    video = "video"
    file  = "file"
    audio = "audio"

class Message(Base):
    __tablename__ = "messages"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_id       = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    receiver_id     = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    body            = Column(Text, nullable=True)          # encrypted ciphertext
    message_type    = Column(Enum(MessageType), default=MessageType.text)
    status          = Column(Enum(MessageStatus), default=MessageStatus.sent)
    parent_id       = Column(UUID(as_uuid=True), ForeignKey("messages.id"), nullable=True)
    media_url       = Column(Text, nullable=True)
    media_name      = Column(String(255), nullable=True)
    media_size      = Column(String(50), nullable=True)
    is_deleted      = Column(Boolean, default=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    sender          = relationship("User", foreign_keys=[sender_id])
    receiver        = relationship("User", foreign_keys=[receiver_id])
    parent          = relationship("Message", remote_side=[id])