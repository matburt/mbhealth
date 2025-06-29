from fastapi import APIRouter
from app.api.api_v1.endpoints import auth, users, health_data, families, care_teams, notes, ai_analysis, reports, timezone

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(health_data.router, prefix="/health-data", tags=["health-data"])
api_router.include_router(families.router, prefix="/families", tags=["families"])
api_router.include_router(care_teams.router, prefix="/care-teams", tags=["care-teams"])
api_router.include_router(notes.router, prefix="/notes", tags=["notes"])
api_router.include_router(ai_analysis.router, prefix="/ai-analysis", tags=["ai-analysis"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(timezone.router, prefix="/timezone", tags=["timezone"]) 