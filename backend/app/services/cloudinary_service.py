import cloudinary
import cloudinary.uploader
import cloudinary.utils
import time
from app.config import settings

cloudinary.config(
    cloud_name = settings.CLOUDINARY_CLOUD_NAME,
    api_key    = settings.CLOUDINARY_API_KEY,
    api_secret = settings.CLOUDINARY_API_SECRET,
    secure     = True,
)

ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_VIDEO = {"video/mp4", "video/webm", "video/quicktime"}
ALLOWED_AUDIO = {"audio/mpeg", "audio/ogg", "audio/wav", "audio/webm", "audio/mp4"}
ALLOWED_FILE  = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "text/plain",
}

MAX_SIZE = {
    "image": 10  * 1024 * 1024,   # 10 MB
    "video": 100 * 1024 * 1024,   # 100 MB
    "audio": 20  * 1024 * 1024,   # 20 MB
    "file" : 25  * 1024 * 1024,   # 25 MB
}

def get_media_type(mime: str) -> str:
    if mime in ALLOWED_IMAGE: return "image"
    if mime in ALLOWED_VIDEO: return "video"
    if mime in ALLOWED_AUDIO: return "audio"
    if mime in ALLOWED_FILE:  return "file"
    return None

def generate_upload_signature(folder: str, user_id: str) -> dict:
    """
    Generate a signed upload payload.
    The frontend uploads directly to Cloudinary — our server never
    handles the raw file bytes, keeping memory usage minimal.
    """
    timestamp  = int(time.time())
    public_id  = f"{folder}/{user_id}/{timestamp}"
    params     = {
        "timestamp" : timestamp,
        "folder"    : folder,
        "public_id" : public_id,
    }
    signature = cloudinary.utils.api_sign_request(
        params, settings.CLOUDINARY_API_SECRET
    )
    return {
        "upload_url" : f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/auto/upload",
        "public_id"  : public_id,
        "signature"  : signature,
        "timestamp"  : timestamp,
        "api_key"    : settings.CLOUDINARY_API_KEY,
        "cloud_name" : settings.CLOUDINARY_CLOUD_NAME,
        "folder"     : folder,
    }

async def delete_media(public_id: str, resource_type: str = "auto") -> None:
    cloudinary.uploader.destroy(public_id, resource_type=resource_type)