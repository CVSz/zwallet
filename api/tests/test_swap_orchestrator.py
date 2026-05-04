from app.application.swap import SwapOrchestrator


def test_fetch_and_normalize_quotes():
    orchestrator = SwapOrchestrator()
    quotes = orchestrator.fetch_quotes("ETH", "USDC", 2500, 50)
    assert len(quotes) == 4
    normalized = orchestrator.normalize_routes(quotes)
    assert normalized[0].score >= normalized[1].score
    assert all(q.route[0] == "ETH" and q.route[-1] == "USDC" for q in normalized)
    assert normalized[0].estimated_gas <= normalized[-1].estimated_gas


def test_fetch_quotes_rejects_invalid_slippage_and_amount():
    orchestrator = SwapOrchestrator()
    try:
        orchestrator.fetch_quotes("ETH", "USDC", 0, 50)
        assert False, "expected amount validation"
    except ValueError as exc:
        assert str(exc) == "amount_must_be_positive"

    try:
        orchestrator.fetch_quotes("ETH", "USDC", 100, 5001)
        assert False, "expected slippage validation"
    except ValueError as exc:
        assert str(exc) == "slippage_out_of_bounds"


def test_simulation_rejects_slippage():
    orchestrator = SwapOrchestrator()
    quote = orchestrator.fetch_quotes("ETH", "USDC", 100, 100)[0]
    ok, reason = orchestrator.simulate_transaction(quote, min_out=quote.expected_out + 10)
    assert ok is False
    assert reason == "slippage_violation"
