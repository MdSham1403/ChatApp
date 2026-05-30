from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.message import MessageResponse
from app.services import message_service
from app.services.jwt_bearer import get_current_user
from app.models.user import User
from uuid import UUID

router = APIRouter(prefix="/messages", tags=["messages"])

@router.get("/{user_id}", response_model=list[MessageResponse])
async def get_messages(
    user_id : UUID,
    limit   : int = 50,
    db      : AsyncSession = Depends(get_db),
    me      : User = Depends(get_current_user),
):
    msgs = await message_service.get_conversation(db, me.id, user_id, limit)
    # Attach reactions to each message
    result = []
    for msg in msgs:
        reactions = await message_service.get_reactions(db, msg.id)
        d = {
            "id"          : msg.id,
            "sender_id"   : msg.sender_id,
            "receiver_id" : msg.receiver_id,
            "body"        : msg.body,
            "message_type": msg.message_type,
            "status"      : msg.status,
            "parent_id"   : msg.parent_id,
            "media_url"   : msg.media_url,
            "media_name"  : msg.media_name,
            "media_size"  : msg.media_size,
            "is_deleted"  : msg.is_deleted,
            "reactions"   : reactions,
            "created_at"  : msg.created_at,
        }
        result.append(d)
    return result