from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, update
from sqlalchemy.orm import selectinload
from uuid import UUID
from app.models.message import Message, MessageStatus, MessageType
from app.models.reaction import Reaction
from app.models.user import User

async def save_message(
    db: AsyncSession,
    sender_id: UUID,
    receiver_id: UUID,
    body: str | None,
    message_type: MessageType,
    parent_id: UUID | None,
    media_url: str | None,
    media_name: str | None,
    media_size: str | None,
) -> Message:
    msg = Message(
        sender_id    = sender_id,
        receiver_id  = receiver_id,
        body         = body,
        message_type = message_type,
        parent_id    = parent_id,
        media_url    = media_url,
        media_name   = media_name,
        media_size   = media_size,
        status       = MessageStatus.sent,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg

async def get_conversation(
    db: AsyncSession,
    user_a: UUID,
    user_b: UUID,
    limit: int = 50,
    before_id: UUID | None = None,
) -> list[Message]:
    q = (
        select(Message)
        .options(selectinload(Message.sender), selectinload(Message.receiver))
        .where(
            or_(
                and_(Message.sender_id == user_a, Message.receiver_id == user_b),
                and_(Message.sender_id == user_b, Message.receiver_id == user_a),
            )
        )
        .where(Message.is_deleted == False)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(q)
    msgs = result.scalars().all()
    return list(reversed(msgs))

async def mark_delivered(db: AsyncSession, message_id: UUID) -> None:
    await db.execute(
        update(Message)
        .where(Message.id == message_id)
        .values(status=MessageStatus.delivered)
    )
    await db.commit()

async def mark_read(db: AsyncSession, sender_id: UUID, receiver_id: UUID) -> None:
    await db.execute(
        update(Message)
        .where(
            and_(
                Message.sender_id == sender_id,
                Message.receiver_id == receiver_id,
                Message.status != MessageStatus.read,
            )
        )
        .values(status=MessageStatus.read)
    )
    await db.commit()

async def soft_delete(
    db: AsyncSession, message_id: UUID, user_id: UUID
) -> bool:
    result = await db.execute(
        select(Message).where(
            and_(Message.id == message_id, Message.sender_id == user_id)
        )
    )
    msg = result.scalar_one_or_none()
    if not msg:
        return False
    msg.is_deleted = True
    msg.body = None
    await db.commit()
    return True

async def add_reaction(
    db: AsyncSession, message_id: UUID, user_id: UUID, emoji: str
) -> Reaction:
    existing = await db.execute(
        select(Reaction).where(
            and_(
                Reaction.message_id == message_id,
                Reaction.user_id    == user_id,
                Reaction.emoji      == emoji,
            )
        )
    )
    r = existing.scalar_one_or_none()
    if r:
        await db.delete(r)      # toggle off
        await db.commit()
        return None
    reaction = Reaction(message_id=message_id, user_id=user_id, emoji=emoji)
    db.add(reaction)
    await db.commit()
    await db.refresh(reaction)
    return reaction

async def get_reactions(db: AsyncSession, message_id: UUID) -> list[dict]:
    result = await db.execute(
        select(Reaction, User)
        .join(User, Reaction.user_id == User.id)
        .where(Reaction.message_id == message_id)
    )
    rows = result.all()
    return [
        {"emoji": r.emoji, "user_id": str(r.user_id), "username": u.username}
        for r, u in rows
    ]