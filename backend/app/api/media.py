from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.media import UploadURLResponse, MediaResponse
from app.services.cloudinary_service import (
    generate_upload_signature, get_media_type,
    MAX_SIZE, delete_media
)
from app.services.preview_service import fetch_link_preview
from app.services.jwt_bearer import get_current_user
from app.models.user import User
from app.models.media import Media, MediaType
from sqlalchemy import select
from uuid import UUID

router = APIRouter(prefix="/media", tags=["media"])

@router.get("/upload-url", response_model=UploadURLResponse)
async def get_upload_url(
    media_type : str,
    current_user: User = Depends(get_current_user),
):
    """
    Frontend calls this first to get a signed Cloudinary upload URL.
    Then uploads directly to Cloudinary (never goes through our server).
    """
    allowed = {"image", "video", "audio", "file"}
    if media_type not in allowed:
        raise HTTPException(status_code=400, detail="Invalid media type")

    folder = f"chatapp/{media_type}s"
    return generate_upload_signature(folder, str(current_user.id))


@router.post("/confirm", response_model=MediaResponse)
async def confirm_upload(
    body         : dict,
    db           : AsyncSession = Depends(get_db),
    current_user : User = Depends(get_current_user),
):
    """
    After Cloudinary upload succeeds, frontend calls this to save
    the media record in our DB.
    body = {url, public_id, media_type, filename, size_bytes,
            mime_type, width, height, duration}
    """
    media = Media(
        uploader_id = current_user.id,
        media_type  = MediaType(body["media_type"]),
        url         = body["url"],
        public_id   = body.get("public_id"),
        filename    = body.get("filename"),
        size_bytes  = body.get("size_bytes"),
        mime_type   = body.get("mime_type"),
        width       = body.get("width"),
        height      = body.get("height"),
        duration    = body.get("duration"),
    )
    db.add(media)
    await db.commit()
    await db.refresh(media)
    return media


@router.get("/preview")
async def link_preview(
    url          : str,
    current_user : User = Depends(get_current_user),
):
    preview = await fetch_link_preview(url)
    if not preview:
        raise HTTPException(status_code=404, detail="Could not fetch preview")
    return preview


@router.delete("/{media_id}")
async def remove_media(
    media_id     : UUID,
    db           : AsyncSession = Depends(get_db),
    current_user : User = Depends(get_current_user),
):
    result = await db.execute(
        select(Media).where(
            Media.id == media_id,
            Media.uploader_id == current_user.id
        )
    )
    media = result.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Not found")
    if media.public_id:
        await delete_media(media.public_id)
    await db.delete(media)
    await db.commit()
    return {"deleted": True}