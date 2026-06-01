from fastapi import WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.services.auth_service import decode_token, get_user_by_id
from app.services import message_service, redis_service
from app.ws.manager import manager
from app.schemas.message import MessageSend
from app.models.message import MessageType
import json, asyncio
from uuid import UUID

async def get_ws_user(token: str, db: AsyncSession):
    payload = decode_token(token)
    if not payload:
        return None
    return await get_user_by_id(db, payload.get("sub"))

async def ws_heartbeat(user_id: str):
    """Renew online presence every 30s."""
    while True:
        await redis_service.set_online(user_id)
        await asyncio.sleep(30)

async def chat_ws(websocket: WebSocket, db: AsyncSession = Depends(get_db)):
    # Auth via query param: ws://…/ws/chat?token=xxx
    token = websocket.query_params.get("token")
    user  = await get_ws_user(token, db)

    if not user:
        await websocket.close(code=4001)
        return

    user_id = str(user.id)
    await manager.connect(user_id, websocket)
    await redis_service.set_online(user_id)

    heartbeat_task = asyncio.create_task(ws_heartbeat(user_id))

    try:
        while True:
            raw  = await websocket.receive_text()
            data = json.loads(raw)
            evt  = data.get("type")
            pl   = data.get("payload", {})

            # ── Send message ─────────────────────────────────────────────────
            if evt == "send":
                msg = await message_service.save_message(
                    db,
                    sender_id    = user.id,
                    receiver_id  = UUID(pl["receiver_id"]),
                    body         = pl.get("body"),
                    message_type = MessageType(pl.get("message_type", "text")),
                    parent_id    = UUID(pl["parent_id"]) if pl.get("parent_id") else None,
                    media_url    = pl.get("media_url"),
                    media_name   = pl.get("media_name"),
                    media_size   = pl.get("media_size"),
                )
                frame = {
                    "type": "message",
                    "payload": {
                        "id"          : str(msg.id),
                        "sender_id"   : str(msg.sender_id),
                        "receiver_id" : str(msg.receiver_id),
                        "body"        : msg.body,
                        "message_type": msg.message_type.value,
                        "status"      : msg.status.value,
                        "parent_id"   : str(msg.parent_id) if msg.parent_id else None,
                        "media_url"   : msg.media_url,
                        "media_name"  : msg.media_name,
                        "media_size"  : msg.media_size,
                        "reactions"   : [],
                        "created_at"  : msg.created_at.isoformat(),
                    },
                }
                # Echo to sender
                await manager.send(user_id, frame)
                
                # Deliver to receiver / Wire push into WebSocket send
                receiver_id_str = str(pl["receiver_id"])
                if manager.is_connected(receiver_id_str):
                    await manager.send(receiver_id_str, frame)
                    await message_service.mark_delivered(db, msg.id)
                    await manager.send(user_id, {
                        "type": "status",
                        "payload": {"message_id": str(msg.id), "status": "delivered"},
                    })
                else:
                    # User is offline — send push notification
                    from app.services.push_service import notify_user
                    await notify_user(
                        db,
                        user_id = receiver_id_str,
                        title   = user.display_name or user.username,
                        body    = pl.get("body", "Sent a message")[:80],
                        data    = {"sender_id": user_id, "message_id": str(msg.id)},
                    )

            # ── Mark read ────────────────────────────────────────────────────
            elif evt == "read":
                await message_service.mark_read(
                    db,
                    sender_id   = UUID(pl["sender_id"]),
                    receiver_id = user.id,
                )
                await manager.send(pl["sender_id"], {
                    "type": "read",
                    "payload": {"by": user_id},
                })

            # ── Typing ───────────────────────────────────────────────────────
            elif evt == "typing":
                receiver_id = pl.get("receiver_id")
                if receiver_id:
                    await redis_service.set_typing(user_id, receiver_id)
                    await manager.send(receiver_id, {
                        "type": "typing",
                        "payload": {"from": user_id, "is_typing": True},
                    })

            # ── Stop typing ──────────────────────────────────────────────────
            elif evt == "stop_typing":
                receiver_id = pl.get("receiver_id")
                if receiver_id:
                    await redis_service.clear_typing(user_id, receiver_id)
                    await manager.send(receiver_id, {
                        "type": "typing",
                        "payload": {"from": user_id, "is_typing": False},
                    })

            # ── Reaction ─────────────────────────────────────────────────────
            elif evt == "reaction":
                reaction = await message_service.add_reaction(
                    db,
                    message_id = UUID(pl["message_id"]),
                    user_id    = user.id,
                    emoji      = pl["emoji"],
                )
                reactions = await message_service.get_reactions(
                    db, UUID(pl["message_id"])
                )
                react_frame = {
                    "type": "reaction",
                    "payload": {
                        "message_id": pl["message_id"],
                        "reactions" : reactions,
                    },
                }
                await manager.send(user_id, react_frame)
                await manager.send(pl["other_user_id"], react_frame)

            # ── Delete ───────────────────────────────────────────────────────
            elif evt == "delete":
                ok = await message_service.soft_delete(
                    db, UUID(pl["message_id"]), user.id
                )
                if ok:
                    delete_frame = {
                        "type": "deleted",
                        "payload": {"message_id": pl["message_id"]},
                    }
                    await manager.send(user_id, delete_frame)
                    await manager.send(pl["other_user_id"], delete_frame)

            # ── Heartbeat ────────────────────────────────────────────────────
            elif evt == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        pass
    finally:
        heartbeat_task.cancel()
        await manager.disconnect(user_id, websocket)
        await redis_service.set_offline(user_id)