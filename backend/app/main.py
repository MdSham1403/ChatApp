from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import auth, users, messages
from app.ws.chat import chat_ws
from app.api import auth, users, messages, media


app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(messages.router)
app.include_router(media.router)

@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    from app.db.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        await chat_ws(websocket, db)

@app.get("/")
async def root():
    return {"status": "ok", "app": settings.APP_NAME}