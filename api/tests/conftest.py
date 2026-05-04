import os
import sys
import types
from contextlib import asynccontextmanager

import pytest
from fastapi.testclient import TestClient

# Minimal runtime settings for app.core.config.Settings
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test.db")
os.environ.setdefault("ETHEREUM_RPC_URL", "http://localhost:8545")
os.environ.setdefault("ENVIRONMENT", "development")

# Pydantic EmailStr requires optional email_validator package; provide a lightweight stub for tests.
if "email_validator" not in sys.modules:
    email_validator = types.ModuleType("email_validator")

    def validate_email(email, *args, **kwargs):
        class _Result:
            normalized = email

        return _Result()

    email_validator.validate_email = validate_email
    email_validator.EmailNotValidError = ValueError
    sys.modules["email_validator"] = email_validator


@pytest.fixture
def api_client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    from app.main import app
    from app.interfaces.http.deps import require_user

    async def _fake_user() -> str:
        return "test-user"

    @asynccontextmanager
    async def _no_lifespan(_app):
        yield

    app.router.lifespan_context = _no_lifespan
    app.dependency_overrides[require_user] = _fake_user
    client = TestClient(app)
    try:
        yield client
    finally:
        app.dependency_overrides.clear()
