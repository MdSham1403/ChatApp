from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    REDIS_URL: str
    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str
    APP_NAME: str = "ChatApp"
    VAPID_PRIVATE_KEY: str = ""
    VAPID_PUBLIC_KEY: str = ""
    VAPID_SUBJECT: str = "mailto:mdsham1403@gmail.com"
    FRONTEND_URL: str = "http://localhost:5173/"

    class Config:
        env_file = ".env"
        # ── ADD THIS LINE TO FIX THE EXTRA INPUT ERROR ────────────────────────
        extra = "ignore"

settings = Settings()