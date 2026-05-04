from dataclasses import dataclass
from random import random


class SwapExecutionError(RuntimeError):
    pass


@dataclass
class RouteQuote:
    route_id: str
    provider: str
    route: list[str]
    expected_out: float
    estimated_gas: int
    score: float


class SwapOrchestrator:
    PROVIDERS = ("1inch", "jupiter")
    MAX_SLIPPAGE_BPS = 5_000
    GAS_TOKEN_PRICE = 0.000001

    def fetch_quotes(self, from_token: str, to_token: str, amount: float, slippage_bps: int) -> list[RouteQuote]:
        if amount <= 0:
            raise ValueError("amount_must_be_positive")
        if slippage_bps < 0 or slippage_bps > self.MAX_SLIPPAGE_BPS:
            raise ValueError("slippage_out_of_bounds")
        # deterministic quote curve used until provider adapters are wired.
        quotes: list[RouteQuote] = []
        for provider in self.PROVIDERS:
            base_out = amount * (0.998 if provider == "1inch" else 0.997)
            fee_penalty = 1 - (slippage_bps / 100_000)
            expected_out = round(base_out * fee_penalty, 8)
            route_options = (
                [from_token, to_token],
                [from_token, "USDC", to_token],
            ) if amount > 1000 else ([from_token, to_token],)

            for route in route_options:
                gas = 140_000 if len(route) == 3 else 90_000
                score = expected_out - (gas * self.GAS_TOKEN_PRICE)
                quotes.append(
                    RouteQuote(
                        route_id=f"{provider}:{'-'.join(route)}:{int(amount)}",
                        provider=provider,
                        route=route,
                        expected_out=expected_out,
                        estimated_gas=gas,
                        score=score,
                    )
                )
        return quotes

    def normalize_routes(self, quotes: list[RouteQuote]) -> list[RouteQuote]:
        # sort by score descending and deduplicate route ids.
        unique: dict[str, RouteQuote] = {}
        for quote in quotes:
            unique[quote.route_id] = quote
        return sorted(unique.values(), key=lambda q: q.score, reverse=True)

    def simulate_transaction(self, quote: RouteQuote, min_out: float | None = None) -> tuple[bool, str]:
        # emulate RPC instability and slippage rejection logic.
        if random() < 0.08:
            return False, "rpc_failure"
        if min_out is not None and quote.expected_out < min_out:
            return False, "slippage_violation"
        return True, "ok"

    def execute_with_fallback(self, route_candidates: list[RouteQuote], min_out: float, max_retries: int) -> dict:
        failures: list[dict[str, str]] = []
        attempts = 0
        for quote in route_candidates:
            for _ in range(max_retries + 1):
                attempts += 1
                simulated, reason = self.simulate_transaction(quote, min_out=min_out)
                if not simulated:
                    failures.append({"route_id": quote.route_id, "reason": reason})
                    if reason == "slippage_violation":
                        break
                    continue
                if random() < 0.05:
                    failures.append({"route_id": quote.route_id, "reason": "partial_execution"})
                    continue
                return {
                    "status": "submitted",
                    "route_id": quote.route_id,
                    "provider": quote.provider,
                    "attempts": attempts,
                    "tx_hash": f"0x{abs(hash((quote.route_id, attempts))) & ((1 << 256) - 1):064x}",
                    "failures": failures,
                }
        raise SwapExecutionError("Unable to execute route after retries")
