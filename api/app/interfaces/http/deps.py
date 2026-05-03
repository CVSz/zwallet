from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import decode_access_token
from app.infrastructure.db import get_session

bearer = HTTPBearer(auto_error=True)


async def require_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> str:
    try:
        claims = decode_access_token(credentials.credentials)
        return claims["sub"]
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


def session_dep(session: AsyncSession = Depends(get_session)) -> AsyncSession:
    return session
