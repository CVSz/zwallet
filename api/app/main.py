from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.application.schemas import RegisterRequest, LoginRequest, TokenResponse, TransferRequestDTO
from app.application.services import AuthService, WalletService
from app.infrastructure.blockchain import EthereumClient
from app.infrastructure.db import engine, Base
from app.infrastructure.repositories import UserRepository
from app.interfaces.http.deps import require_user, session_dep

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="ZWallet API", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(_, exc):
    raise HTTPException(status_code=429, detail="Rate limit exceeded") from exc


@app.post("/v1/auth/register", response_model=TokenResponse)
@limiter.limit("10/minute")
async def register(payload: RegisterRequest, session: AsyncSession = Depends(session_dep)) -> TokenResponse:
    try:
        token = await AuthService(UserRepository(session)).register(payload.email, payload.password)
        return TokenResponse(access_token=token)
    except IntegrityError as exc:
        raise HTTPException(status_code=409, detail="Email already registered") from exc


@app.post("/v1/auth/login", response_model=TokenResponse)
@limiter.limit("15/minute")
async def login(payload: LoginRequest, session: AsyncSession = Depends(session_dep)) -> TokenResponse:
    token = await AuthService(UserRepository(session)).login(payload.email, payload.password)
    return TokenResponse(access_token=token)


@app.post("/v1/wallet/transfer")
@limiter.limit("5/minute")
async def transfer(payload: TransferRequestDTO, _: str = Depends(require_user)) -> dict:
    tx_hash = WalletService(EthereumClient()).transfer(
        payload.from_address, payload.to_address, payload.amount_eth, payload.private_key
    )
    return {"status": "submitted", "tx_hash": tx_hash}
