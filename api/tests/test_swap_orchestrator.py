from app.application.swap import SwapOrchestrator


def test_fetch_and_normalize_quotes():
    orchestrator = SwapOrchestrator()
    quotes = orchestrator.fetch_quotes("ETH", "USDC", 2500, 50)
    assert len(quotes) == 2
    normalized = orchestrator.normalize_routes(quotes)
    assert normalized[0].score >= normalized[1].score
    assert all(q.route[0] == "ETH" and q.route[-1] == "USDC" for q in normalized)


def test_simulation_rejects_slippage():
    orchestrator = SwapOrchestrator()
    quote = orchestrator.fetch_quotes("ETH", "USDC", 100, 100)[0]
    ok, reason = orchestrator.simulate_transaction(quote, min_out=quote.expected_out + 10)
    assert ok is False
    assert reason == "slippage_violation"
