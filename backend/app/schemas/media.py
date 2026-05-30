from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.models.media import MediaType

class MediaResponse(BaseModel):
    id         : UUID
    media_type : MediaType
    url        : str
    filename   : Optional[str]
    size_bytes : Optional[int]
    mime_type  : Optional[str]
    width      : Optional[int]
    height     : Optional[int]
    duration   : Optional[int]
    created_at : datetime

    model_config = {"from_attributes": True}

class UploadURLResponse(BaseModel):
    upload_url : str
    public_id  : str
    signature  : str
    timestamp  : int
    api_key    : str
    cloud_name : str
    folder     : str