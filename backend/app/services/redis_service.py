import redis.asyncio as aioredis
from app.config import settings

_redis: aioredis.Redis | None = None

async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis

# ── Presence ──────────────────────────────────────────────────────────────────

async def set_online(user_id: str) -> None:
    r = await get_redis()
    await r.setex(f"online:{user_id}", 60, "1")   # expires in 60s, heartbeat renews

async def set_offline(user_id: str) -> None:
    r = await get_redis()
    await r.delete(f"online:{user_id}")

async def is_online(user_id: str) -> bool:
    r = await get_redis()
    return bool(await r.get(f"online:{user_id}"))

# ── Typing indicator ──────────────────────────────────────────────────────────

async def set_typing(sender_id: str, receiver_id: str) -> None:
    r = await get_redis()
    await r.setex(f"typing:{sender_id}:{receiver_id}", 4, "1")

async def clear_typing(sender_id: str, receiver_id: str) -> None:
    r = await get_redis()
    await r.delete(f"typing:{sender_id}:{receiver_id}")

async def is_typing(sender_id: str, receiver_id: str) -> bool:
    r = await get_redis()
    return bool(await r.get(f"typing:{sender_id}:{receiver_id}"))