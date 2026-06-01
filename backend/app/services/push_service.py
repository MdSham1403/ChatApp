from pywebpush import webpush, WebPushException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.push_subscription import PushSubscription
from app.config import settings
import json, asyncio

async def save_subscription(
    db: AsyncSession, user_id: str,
    endpoint: str, p256dh: str, auth: str, user_agent: str = None
) -> None:
    existing = await db.execute(
        select(PushSubscription).where(PushSubscription.endpoint == endpoint)
    )
    sub = existing.scalar_one_or_none()
    if sub:
        sub.user_id = user_id
        sub.p256dh  = p256dh
        sub.auth    = auth
    else:
        sub = PushSubscription(
            user_id    = user_id,
            endpoint   = endpoint,
            p256dh     = p256dh,
            auth       = auth,
            user_agent = user_agent,
        )
        db.add(sub)
    await db.commit()

async def get_subscriptions(
    db: AsyncSession, user_id: str
) -> list[PushSubscription]:
    result = await db.execute(
        select(PushSubscription).where(PushSubscription.user_id == user_id)
    )
    return result.scalars().all()

def _send_push(sub: PushSubscription, payload: dict) -> None:
    try:
        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys"    : {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data            = json.dumps(payload),
            vapid_private_key = settings.VAPID_PRIVATE_KEY,
            vapid_claims    = {"sub": settings.VAPID_SUBJECT},
        )
    except WebPushException as e:
        print(f"Push failed for {sub.endpoint[:40]}…: {e}")

async def notify_user(
    db: AsyncSession, user_id: str,
    title: str, body: str, data: dict = None
) -> None:
    subs    = await get_subscriptions(db, user_id)
    payload = {"title": title, "body": body, "data": data or {}}
    loop    = asyncio.get_event_loop()
    for sub in subs:
        await loop.run_in_executor(None, _send_push, sub, payload)