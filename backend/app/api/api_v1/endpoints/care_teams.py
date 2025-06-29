from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def read_care_teams():
    """
    Get user's care teams
    """
    return {"message": "Care team endpoints coming soon"}
