from dataclasses import dataclass


@dataclass(frozen=True)
class User:
    id: str
    email: str
    password_hash: str


@dataclass(frozen=True)
class TransferRequest:
    from_address: str
    to_address: str
    amount_eth: float
    private_key: str
