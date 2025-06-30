from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_token
from app.schemas.user import User
from app.services.user import get_user_by_username

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login/access-token")

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = verify_token(token)
    if payload is None:
        raise credentials_exception

    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception

    user = get_user_by_username(db, username=username)
    if user is None:
        raise credentials_exception

    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_user_from_token(token: str) -> User | None:
    """
    Get current user from JWT token (for WebSocket authentication)
    """
    try:
        payload = verify_token(token)
        if payload is None:
            return None

        username: str = payload.get("sub")
        if username is None:
            return None

        # We need a database session for this
        from app.core.database import SessionLocal
        db = SessionLocal()
        try:
            user = get_user_by_username(db, username=username)
            return user
        finally:
            db.close()

    except Exception:
        return None


def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db)
) -> User | None:
    """
    Get current user optionally - returns None if not authenticated instead of raising error.
    Used for endpoints that can work with or without authentication.
    """
    try:
        # Try to get the Authorization header
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            return None

        token = authorization.split(" ")[1]
        payload = verify_token(token)
        if payload is None:
            return None

        username: str = payload.get("sub")
        if username is None:
            return None

        user = get_user_by_username(db, username=username)
        if user is None or not user.is_active:
            return None

        return user

    except Exception:
        return None
