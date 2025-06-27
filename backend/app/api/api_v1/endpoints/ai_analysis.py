from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.user import User
from app.api.deps import get_current_active_user
from app.models.health_data import HealthData
from app.core.config import settings
import httpx

router = APIRouter()

@router.post("/", response_model=Dict[str, Any])
async def analyze_health_data(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    health_data_ids: list[int],
    provider: str = "openai",
    prompt: str = "Analyze this health data for trends and recommendations."
) -> Any:
    # Fetch health data
    data = db.query(HealthData).filter(HealthData.id.in_(health_data_ids), HealthData.user_id == current_user.id).all()
    if not data:
        raise HTTPException(status_code=404, detail="No health data found for analysis.")
    # Prepare data for AI
    data_payload = [
        {
            "metric_type": d.metric_type,
            "value": d.value,
            "unit": d.unit,
            "systolic": d.systolic,
            "diastolic": d.diastolic,
            "recorded_at": d.recorded_at.isoformat(),
            "notes": d.notes,
        }
        for d in data
    ]
    # Call selected provider
    if provider == "openai":
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            raise HTTPException(status_code=400, detail="OpenAI API key not configured.")
        headers = {"Authorization": f"Bearer {api_key}"}
        payload = {
            "model": "gpt-3.5-turbo",
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": str(data_payload)}
            ]
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()
    elif provider == "openrouter":
        api_key = settings.OPENROUTER_API_KEY
        if not api_key:
            raise HTTPException(status_code=400, detail="OpenRouter API key not configured.")
        headers = {"Authorization": f"Bearer {api_key}"}
        payload = {
            "model": "openrouter/gpt-3.5-turbo",
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": str(data_payload)}
            ]
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post("https://openrouter.ai/api/v1/chat/completions", json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()
    elif provider == "google":
        api_key = settings.GOOGLE_AI_API_KEY
        if not api_key:
            raise HTTPException(status_code=400, detail="Google AI API key not configured.")
        headers = {"Authorization": f"Bearer {api_key}"}
        payload = {
            "contents": [
                {"role": "user", "parts": [prompt, str(data_payload)]}
            ]
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post("https://generativelanguage.googleapis.com/v1beta2/models/chat-bison-001:generateMessage", json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()
    else:
        raise HTTPException(status_code=400, detail="Unknown provider.") 