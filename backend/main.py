import uvicorn
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.api.api_v1.api import api_router
from app.api.websocket import websocket_endpoint
from app.core.config import settings
from app.core.database import init_db

# Import models to ensure they're registered with SQLAlchemy
from app.models import *

app = FastAPI(
    title="MBHealth API",
    description="Health data tracking and analysis API",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    print("Running database migrations on startup...")
    success = init_db()
    if not success:
        print("WARNING: Database migration failed during startup")
    else:
        print("Database initialization completed successfully")

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_handler(websocket: WebSocket, token: str = None):
    await websocket_endpoint(websocket, token)

@app.get("/")
async def root():
    return {"message": "Welcome to MBHealth API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

def main():
    """Entry point for the MBHealth application."""
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    main()
