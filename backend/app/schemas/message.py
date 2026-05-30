from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.models.message import MessageStatus, MessageType

class MessageSend(BaseModel):
    receiver_id : UUID
    body        : Optional[str] = None
    message_type: MessageType = MessageType.text
    parent_id   : Optional[UUID] = None
    media_url   : Optional[str] = None
    media_name  : Optional[str] = None
    media_size  : Optional[str] = None

class ReactionSchema(BaseModel):
    emoji    : str
    user_id  : UUID
    username : str

    model_config = {"from_attributes": True}

class MessageResponse(BaseModel):
    id           : UUID
    sender_id    : UUID
    receiver_id  : UUID
    body         : Optional[str]
    message_type : MessageType
    status       : MessageStatus
    parent_id    : Optional[UUID]
    media_url    : Optional[str]
    media_name   : Optional[str]
    media_size   : Optional[str]
    is_deleted   : bool
    reactions    : list[ReactionSchema] = []
    created_at   : datetime

    model_config = {"from_attributes": True}

class WSMessage(BaseModel):
    """Shape of every WebSocket frame sent/received."""
    type    : str          # send | delivered | read | typing | online | reaction | delete
    payload : dict