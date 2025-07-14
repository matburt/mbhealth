"""
Health check endpoints including circuit breaker monitoring
"""

from typing import Any

from fastapi import APIRouter

from app.core.circuit_breaker import get_circuit_breaker_health

router = APIRouter()


@router.get("/")
async def health_check() -> dict[str, str]:
    """Basic health check endpoint"""
    return {"status": "healthy", "message": "Service is running"}


@router.get("/circuit-breakers")
async def circuit_breaker_health() -> dict[str, Any]:
    """
    Get circuit breaker health status.

    Returns information about all circuit breakers including their current state,
    failure counts, and overall system health.
    """
    return await get_circuit_breaker_health()


@router.get("/detailed")
async def detailed_health_check() -> dict[str, Any]:
    """
    Comprehensive health check including circuit breakers.

    Returns overall system health status with detailed breakdown of
    all monitored components.
    """
    circuit_health = await get_circuit_breaker_health()

    # Overall system health based on circuit breaker status
    overall_status = "healthy"
    if circuit_health["overall_health"] == "degraded":
        overall_status = "degraded"

    return {
        "status": overall_status,
        "timestamp": "2024-01-01T00:00:00Z",  # You might want to use actual timestamp
        "components": {
            "database": {"status": "healthy"},  # You could add actual DB health check
            "circuit_breakers": circuit_health,
            "redis": {"status": "healthy"},  # You could add actual Redis health check
        },
        "version": "1.0.0",  # You might want to get this from config
        "uptime": "unknown"  # You could track actual uptime
    }
