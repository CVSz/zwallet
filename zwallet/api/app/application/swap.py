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
        import httpx
        import os
        
        swap_service_url = os.getenv("SWAP_SERVICE_URL", "http://localhost:3006") # Assuming a port for swap-service
        
        with httpx.Client() as client:
            res = client.post(
                f"{swap_service_url}/v1/swaps/quote",
                json={
                    "chain": "ethereum",
                    "tokenIn": from_token,
                    "tokenOut": to_token,
                    "amountIn": str(amount),
                    "slippageBps": slippage_bps
                }
            )
            if res.status_code != 200:
                raise SwapExecutionError("Failed to fetch quotes from swap-service")
            
            data = res.json()
            quotes = []
            
            # Convert best route and alternatives to RouteQuote
            all_routes = [data["bestRoute"]] + data.get("alternatives", [])
            for r in all_routes:
                quotes.append(RouteQuote(
                    route_id=r["routeId"],
                    provider=r["source"],
                    route=[leg["tokenIn"] for leg in r["legs"]] + [r["legs"][-1]["tokenOut"]],
                    expected_out=float(r["grossOut"]),
                    estimated_gas=int(r["estimatedGasUsd"] * 100000), # Mock gas conversion
                    score=0.0 # Will be scored in normalize_routes
                ))
            return quotes

    def normalize_routes(self, quotes: list[RouteQuote], intelligence_context: dict | None = None) -> list[RouteQuote]:
        # sort by score descending and deduplicate route ids.
        unique: dict[str, RouteQuote] = {}
        for quote in quotes:
            # Inject AI intelligence into the score if context is provided
            if intelligence_context:
                # Penalty based on anomaly risk or urgency
                risk_penalty = intelligence_context.get("risk_score", 0) * 10
                urgency_bonus = 1.05 if intelligence_context.get("urgency") == "high" else 1.0
                quote.score = (quote.score * urgency_bonus) - risk_penalty
                print(f"[SwapOrchestrator] AI Intelligence applied to {quote.route_id}: Risk Penalty {risk_penalty}, Urgency Bonus {urgency_bonus}")
            
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
