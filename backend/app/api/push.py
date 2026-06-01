from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.services.push_service import save_subscription
from app.services.jwt_bearer import get_current_user
from app.models.user import User
from app.config import settings

router = APIRouter(prefix="/push", tags=["push"])

@router.get("/vapid-key")
async def get_vapid_key():
    """Frontend fetches this to subscribe to push notifications."""
    return {"public_key": settings.VAPID_PUBLIC_KEY}

@router.post("/subscribe")
async def subscribe(
    body         : dict,
    request      : Request,
    db           : AsyncSession = Depends(get_db),
    current_user : User = Depends(get_current_user),
):
    await save_subscription(
        db,
        user_id    = str(current_user.id),
        endpoint   = body["endpoint"],
        p256dh     = body["keys"]["p256dh"],
        auth       = body["keys"]["auth"],
        user_agent = request.headers.get("user-agent"),
    )
    return {"subscribed": True}