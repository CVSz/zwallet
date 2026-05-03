import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.models import User
from app.infrastructure.entities import UserEntity


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, email: str, password_hash: str) -> User:
        entity = UserEntity(id=str(uuid.uuid4()), email=email, password_hash=password_hash)
        self.session.add(entity)
        await self.session.commit()
        return User(id=entity.id, email=entity.email, password_hash=entity.password_hash)

    async def find_by_email(self, email: str) -> User | None:
        result = await self.session.execute(select(UserEntity).where(UserEntity.email == email))
        entity = result.scalar_one_or_none()
        if not entity:
            return None
        return User(id=entity.id, email=entity.email, password_hash=entity.password_hash)
