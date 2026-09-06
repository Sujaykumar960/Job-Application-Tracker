import json
import logging
from typing import Any, Dict, List, Optional, Set, Tuple
from fastapi import WebSocket

logger = logging.getLogger("careerx.websocket")


class ConnectionManager:
    """Manages active WebSocket connections, multi-tab user tracking, and targeted routing."""

    def __init__(self):
        # Maps userId to a set of active WebSockets (allows multiple tabs per user)
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Reverse mapping from WebSocket instance to userId
        self.socket_user_map: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, user_id: str) -> None:
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        self.socket_user_map[websocket] = user_id
        logger.info(
            "WebSocket connected: user_id=%s, active_tabs=%d",
            user_id,
            len(self.active_connections[user_id]),
        )

    def disconnect(self, websocket: WebSocket) -> Tuple[Optional[str], int]:
        """Remove websocket connection and return user_id and remaining active tabs count."""
        user_id = self.socket_user_map.pop(websocket, None)
        remaining = 0
        if user_id and user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            remaining = len(self.active_connections[user_id])
            if remaining == 0:
                del self.active_connections[user_id]
            logger.info("WebSocket disconnected: user_id=%s, remaining_tabs=%d", user_id, remaining)
        return user_id, remaining

    async def send_personal_envelope(self, envelope: Dict[str, Any], user_id: str) -> bool:
        """Send message envelope to all active connections of a specific user."""
        if user_id not in self.active_connections:
            return False

        dead_sockets = []
        payload_str = json.dumps(envelope)
        for ws in list(self.active_connections[user_id]):
            try:
                await ws.send_text(payload_str)
            except Exception as e:
                logger.warning("Failed to send WebSocket message to %s: %s", user_id, e)
                dead_sockets.append(ws)

        for ws in dead_sockets:
            self.disconnect(ws)

        return len(self.active_connections.get(user_id, set())) > 0

    async def broadcast_to_participants(
        self,
        envelope: Dict[str, Any],
        participant_ids: List[str],
        exclude_user_id: Optional[str] = None,
    ) -> None:
        """Deliver envelope to all active tabs of specified conversation participants."""
        payload_str = json.dumps(envelope)
        for pid in participant_ids:
            if exclude_user_id and pid == exclude_user_id:
                continue
            if pid in self.active_connections:
                dead_sockets = []
                for ws in list(self.active_connections[pid]):
                    try:
                        await ws.send_text(payload_str)
                    except Exception as e:
                        logger.warning("Failed to deliver to participant %s: %s", pid, e)
                        dead_sockets.append(ws)
                for ws in dead_sockets:
                    self.disconnect(ws)

    async def broadcast_envelope(self, envelope: Dict[str, Any], exclude_user_id: Optional[str] = None) -> None:
        """Broadcast envelope to all connected users across the platform."""
        payload_str = json.dumps(envelope)
        for user_id, sockets in list(self.active_connections.items()):
            if exclude_user_id and user_id == exclude_user_id:
                continue
            for ws in list(sockets):
                try:
                    await ws.send_text(payload_str)
                except Exception:
                    self.disconnect(ws)

    def is_user_online(self, user_id: str) -> bool:
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    def is_connected(self, user_id: str) -> bool:
        return self.is_user_online(user_id)

    def get_online_users(self) -> List[str]:
        return list(self.active_connections.keys())


ws_manager = ConnectionManager()
