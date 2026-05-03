from __future__ import annotations

from dataclasses import dataclass
from math import exp


@dataclass(frozen=True)
class FeatureVector:
    values: list[float]
    tags: dict[str, str]


class FeaturePipeline:
    """Builds normalized feature vectors for AI tasks."""

    @staticmethod
    def tx_features(amount_usd: float, hour_of_day: int, destination_risk_score: float, chain_id: int) -> FeatureVector:
        values = [
            min(amount_usd / 10000, 1.0),
            hour_of_day / 23,
            destination_risk_score,
            min(chain_id / 1000, 1.0),
        ]
        return FeatureVector(values=values, tags={"kind": "tx"})

    @staticmethod
    def behavior_features(event_type: str, platform: str, geo_country: str) -> FeatureVector:
        event_map = {"login": 0.1, "swap": 0.6, "transfer": 0.8}
        platform_map = {"ios": 0.2, "android": 0.4, "web": 0.6}
        values = [
            event_map.get(event_type, 0.5),
            platform_map.get(platform, 0.5),
            1.0 if geo_country.upper() in {"US", "CA", "GB", "DE", "FR"} else 0.2,
        ]
        return FeatureVector(values=values, tags={"kind": "behavior", "country": geo_country.upper()})


class VectorStore:
    """Simple vector-store abstraction for pgvector / Weaviate integrations."""

    def __init__(self, provider: str = "pgvector") -> None:
        self.provider = provider

    async def upsert(self, namespace: str, key: str, vector: list[float], metadata: dict[str, str]) -> None:
        # Integration point: persist embeddings to pgvector or Weaviate.
        _ = (namespace, key, vector, metadata)

    async def similarity_search(self, namespace: str, vector: list[float], k: int = 5) -> list[dict[str, float | str]]:
        _ = namespace
        # Integration point: nearest-neighbor lookup; placeholder deterministic output.
        return [
            {"id": f"neighbor-{i}", "similarity": max(0.0, 0.95 - (i * 0.1)), "risk": 0.15 + (i * 0.07)}
            for i in range(k)
        ]


class IntelligenceService:
    def __init__(self, vector_store: VectorStore) -> None:
        self.vector_store = vector_store

    async def detect_transaction_anomaly(self, user_id: str, wallet_address: str, feature_vector: FeatureVector) -> dict:
        neighbors = await self.vector_store.similarity_search("tx-events", feature_vector.values, k=5)
        baseline_risk = sum(float(n["risk"]) for n in neighbors) / len(neighbors)
        raw_score = 0.6 * feature_vector.values[0] + 0.3 * feature_vector.values[2] + 0.1 * baseline_risk
        score = 1 / (1 + exp(-8 * (raw_score - 0.4)))
        label = "anomalous" if score >= 0.65 else "normal"
        await self.vector_store.upsert(
            "tx-events",
            key=f"{user_id}:{wallet_address}",
            vector=feature_vector.values,
            metadata={"label": label},
        )
        return {"score": round(score, 4), "label": label, "metadata": {"baseline_risk": round(baseline_risk, 4)}}

    async def analyze_user_behavior(self, user_id: str, session_id: str, feature_vector: FeatureVector) -> dict:
        neighbors = await self.vector_store.similarity_search("user-behavior", feature_vector.values, k=4)
        consistency = sum(float(n["similarity"]) for n in neighbors) / len(neighbors)
        score = round(1 - consistency, 4)
        label = "drift" if score > 0.25 else "consistent"
        await self.vector_store.upsert(
            "user-behavior", key=f"{user_id}:{session_id}", vector=feature_vector.values, metadata=feature_vector.tags
        )
        return {"score": score, "label": label, "metadata": {"consistency": round(consistency, 4)}}

    async def smart_swap_recommendation(self, feature_vector: FeatureVector, from_token: str, to_token: str, amount: float) -> dict:
        neighbors = await self.vector_store.similarity_search("swap-intents", feature_vector.values, k=3)
        liquidity_conf = sum(float(n["similarity"]) for n in neighbors) / len(neighbors)
        expected_price_impact_bps = round((1 - liquidity_conf) * 85, 2)
        route = f"{from_token}->USDC->{to_token}" if expected_price_impact_bps > 20 else f"{from_token}->{to_token}"
        score = round(max(0.0, 1 - (expected_price_impact_bps / 100)), 4)
        return {
            "score": score,
            "label": "recommended",
            "metadata": {
                "route": route,
                "amount": amount,
                "expected_price_impact_bps": expected_price_impact_bps,
            },
        }
