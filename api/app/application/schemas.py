from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v) or not any(c.isdigit() for c in v) or not any(not c.isalnum() for c in v):
            raise ValueError("Password must include uppercase, number, and symbol")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TransferRequestDTO(BaseModel):
    from_address: str = Field(pattern=r"^0x[a-fA-F0-9]{40}$")
    to_address: str = Field(pattern=r"^0x[a-fA-F0-9]{40}$")
    amount_eth: float = Field(gt=0)
    private_key: str = Field(min_length=64, max_length=66)
