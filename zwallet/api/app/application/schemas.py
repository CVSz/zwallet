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


class TransactionEventDTO(BaseModel):
    user_id: str
    wallet_address: str = Field(pattern=r"^0x[a-fA-F0-9]{40}$")
    amount_usd: float = Field(gt=0)
    token_symbol: str
    chain_id: int = Field(gt=0)
    hour_of_day: int = Field(ge=0, le=23)
    device_fingerprint: str
    destination_risk_score: float = Field(ge=0, le=1)


class BehaviorEventDTO(BaseModel):
    user_id: str
    event_type: str
    session_id: str
    geo_country: str
    platform: str
    event_ts: int = Field(gt=0)


class SwapRecommendationRequestDTO(BaseModel):
    user_id: str
    from_token: str
    to_token: str
    amount: float = Field(gt=0)
    slippage_tolerance_bps: int = Field(ge=1, le=500)
    urgency: str = Field(pattern=r"^(low|medium|high)$")


class InferenceResponse(BaseModel):
    score: float
    label: str
    metadata: dict[str, float | str | int]


class QuoteRequestDTO(BaseModel):
    chain: str = Field(min_length=2, max_length=32)
    from_token: str = Field(min_length=1, max_length=32)
    to_token: str = Field(min_length=1, max_length=32)
    amount: float = Field(gt=0)
    slippage_bps: int = Field(ge=1, le=1000)


class QuoteResponseDTO(BaseModel):
    route_id: str
    provider: str
    route: list[str]
    expected_out: float
    estimated_gas: int
    score: float


class ExecuteRequestDTO(BaseModel):
    chain: str = Field(min_length=2, max_length=32)
    route_id: str = Field(min_length=3, max_length=128)
    from_token: str = Field(min_length=1, max_length=32)
    to_token: str = Field(min_length=1, max_length=32)
    amount: float = Field(gt=0)
    min_out: float = Field(gt=0)
    max_retries: int = Field(ge=0, le=3, default=1)
