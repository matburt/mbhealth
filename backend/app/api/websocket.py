from fastapi import WebSocket, WebSocketDisconnect, Depends
from typing import Dict, List
import json
import logging
from datetime import datetime
from app.api.deps import get_current_user_from_token
from app.schemas.user import User

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Store connections by user ID
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket connected for user {user_id}")

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"WebSocket disconnected for user {user_id}")

    async def send_personal_message(self, message: str, user_id: int):
        if user_id in self.active_connections:
            # Send to all connections for this user
            disconnected = []
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_text(message)
                except:
                    disconnected.append(websocket)
            
            # Clean up disconnected websockets
            for ws in disconnected:
                self.disconnect(ws, user_id)

    async def send_analysis_update(self, user_id: int, analysis_id: int, status: str, progress: dict = None):
        """Send analysis status update to user"""
        message = {
            "type": "analysis_update",
            "analysis_id": analysis_id,
            "status": status,
            "progress": progress,
            "timestamp": str(datetime.utcnow())
        }
        await self.send_personal_message(json.dumps(message), user_id)

# Global connection manager
manager = ConnectionManager()

async def websocket_endpoint(websocket: WebSocket, token: str = None):
    """
    WebSocket endpoint for real-time updates
    Query parameter: token (JWT token for authentication)
    """
    try:
        # Authenticate user
        if not token:
            await websocket.close(code=4001, reason="Authentication required")
            return
        
        # Get user from token (you'll need to implement this)
        try:
            # This is a simplified version - you'll need proper token validation
            user = await get_current_user_from_token(token)
            if not user:
                await websocket.close(code=4001, reason="Invalid token")
                return
        except Exception as e:
            await websocket.close(code=4001, reason="Authentication failed")
            return
        
        await manager.connect(websocket, user.id)
        
        try:
            while True:
                # Keep connection alive and handle any incoming messages
                data = await websocket.receive_text()
                
                # Handle ping/pong for connection health
                if data == "ping":
                    await websocket.send_text("pong")
                
        except WebSocketDisconnect:
            manager.disconnect(websocket, user.id)
            
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        try:
            await websocket.close(code=4000, reason="Server error")
        except:
            pass