from fastapi import HTTPException, status
from app.core.security import hash_password, verify_password, create_access_token
from app.infrastructure.repositories import UserRepository
from app.infrastructure.blockchain import EthereumClient


class AuthService:
    def __init__(self, user_repo: UserRepository) -> None:
        self.user_repo = user_repo

    async def register(self, email: str, password: str) -> str:
        existing = await self.user_repo.find_by_email(email)
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        user = await self.user_repo.create(email=email, password_hash=hash_password(password))
        return create_access_token(user.id)

    async def login(self, email: str, password: str) -> str:
        user = await self.user_repo.find_by_email(email)
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        return create_access_token(user.id)


class WalletService:
    def __init__(self, eth_client: EthereumClient) -> None:
        self.eth_client = eth_client

    def transfer(self, from_address: str, to_address: str, amount_eth: float, private_key: str) -> str:
        return self.eth_client.transfer_eth(from_address, to_address, amount_eth, private_key)
