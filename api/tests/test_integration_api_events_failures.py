import asyncio

from app.application.ai import FeaturePipeline, IntelligenceService, VectorStore
from app.application.swap import RouteQuote, SwapExecutionError, SwapOrchestrator


def test_integration_event_pipeline_transaction_and_behavior():
    pipeline = FeaturePipeline()
    service = IntelligenceService(VectorStore(provider="pgvector"))

    tx_features = pipeline.tx_features(amount_usd=420, hour_of_day=14, destination_risk_score=0.2, chain_id=1)
    tx_result = asyncio.run(service.detect_transaction_anomaly("u1", "0xabc", tx_features))
    assert tx_result["label"] in {"normal", "anomalous"}
    assert 0 <= tx_result["score"] <= 1

    behavior_features = pipeline.behavior_features(event_type="swap", platform="android", geo_country="US")
    behavior_result = asyncio.run(service.analyze_user_behavior("u1", "s1", behavior_features))
    assert behavior_result["label"] in {"consistent", "drift"}
    assert 0 <= behavior_result["score"] <= 1


def test_failure_rpc_down(monkeypatch):
    orchestrator = SwapOrchestrator()
    quotes = orchestrator.normalize_routes(orchestrator.fetch_quotes("ETH", "USDC", 1200, 100))

    def _always_rpc_fail(_quote, min_out=None):
        return False, "rpc_failure"

    monkeypatch.setattr(orchestrator, "simulate_transaction", _always_rpc_fail)

    try:
        orchestrator.execute_with_fallback(quotes, min_out=1, max_retries=1)
        assert False, "expected rpc failure to exhaust retries"
    except SwapExecutionError as exc:
        assert "Unable to execute route" in str(exc)


def test_failure_insufficient_liquidity_and_invalid_tx():
    orchestrator = SwapOrchestrator()

    # invalid tx request surface: amount validation failure.
    try:
        orchestrator.fetch_quotes("ETH", "USDC", amount=0, slippage_bps=100)
        assert False, "expected amount validation error"
    except ValueError as exc:
        assert str(exc) == "amount_must_be_positive"

    # insufficient liquidity analogue: min_out above all route expected outputs.
    illiquid_candidates = [
        RouteQuote("r1", "1inch", ["ETH", "USDC"], expected_out=50.0, estimated_gas=90_000, score=1.0),
        RouteQuote("r2", "jupiter", ["ETH", "USDC"], expected_out=49.5, estimated_gas=90_000, score=0.9),
    ]
    try:
        orchestrator.execute_with_fallback(illiquid_candidates, min_out=1000.0, max_retries=1)
        assert False, "expected insufficient liquidity style failure"
    except SwapExecutionError as exc:
        assert "Unable to execute route" in str(exc)
