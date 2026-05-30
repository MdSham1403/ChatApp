from fastapi import WebSocket
import asyncio, json

class ConnectionManager:
    def __init__(self):
        # user_id (str) → list of WebSocket (same user, multiple tabs)
        self._connections: dict[str, list[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._connections.setdefault(user_id, []).append(ws)

    async def disconnect(self, user_id: str, ws: WebSocket) -> None:
        async with self._lock:
            conns = self._connections.get(user_id, [])
            if ws in conns:
                conns.remove(ws)
            if not conns:
                self._connections.pop(user_id, None)

    def is_connected(self, user_id: str) -> bool:
        return bool(self._connections.get(user_id))

    async def send(self, user_id: str, data: dict) -> None:
        """Send to all tabs of a user. Silently drop dead sockets."""
        conns = self._connections.get(user_id, [])
        dead = []
        for ws in conns:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(user_id, ws)

    async def broadcast(self, user_ids: list[str], data: dict) -> None:
        await asyncio.gather(*[self.send(uid, data) for uid in user_ids])


manager = ConnectionManager()