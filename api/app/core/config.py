from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    app_name: str = "ZWallet API"
    environment: str = Field(default="production", pattern="^(development|staging|production)$")
    secret_key: SecretStr
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = Field(default=15, ge=5, le=120)
    database_url: str
    ethereum_rpc_url: str
    max_tx_value_eth: float = Field(default=10.0, gt=0)


settings = Settings()
