from app.application.swap import RouteQuote, SwapOrchestrator, SwapExecutionError
from app.infrastructure.blockchain import EthereumClient


class _FakeEth:
    chain_id = 1
    gas_price = 100

    class account:
        @staticmethod
        def sign_transaction(tx, private_key):
            class _Signed:
                raw_transaction = b"raw-tx"

            return _Signed()

    @staticmethod
    def get_transaction_count(_address):
        return 9

    @staticmethod
    def send_raw_transaction(_raw):
        class _TxHash:
            @staticmethod
            def hex():
                return "0xabc123"

        return _TxHash()


class _FakeW3:
    eth = _FakeEth()

    @staticmethod
    def to_wei(value, unit):
        if unit == "ether":
            return int(value * 10**18)
        if unit == "gwei":
            return int(value * 10**9)
        return int(value)


def test_crypto_transfer_builds_and_submits_transaction(monkeypatch):
    client = EthereumClient()
    monkeypatch.setattr(client, "w3", _FakeW3())

    tx_hash = client.transfer_eth(
        from_address="0x1111111111111111111111111111111111111111",
        to_address="0x2222222222222222222222222222222222222222",
        amount_eth=0.5,
        private_key="0x" + "1" * 64,
    )

    assert tx_hash == "0xabc123"


def test_swap_route_selection_includes_gas_and_sorted_descending():
    orchestrator = SwapOrchestrator()
    quotes = orchestrator.fetch_quotes("ETH", "USDC", amount=2000, slippage_bps=100)
    normalized = orchestrator.normalize_routes(quotes)

    assert len(normalized) >= 2
    assert normalized[0].score >= normalized[1].score
    assert all(q.estimated_gas in (90_000, 140_000) for q in normalized)


def test_swap_execute_fails_when_all_routes_invalid_slippage():
    orchestrator = SwapOrchestrator()
    candidates = [
        RouteQuote("r1", "p1", ["ETH", "USDC"], expected_out=99, estimated_gas=90_000, score=1),
        RouteQuote("r2", "p2", ["ETH", "USDC"], expected_out=98, estimated_gas=90_000, score=1),
    ]

    try:
        orchestrator.execute_with_fallback(candidates, min_out=100, max_retries=1)
        assert False, "expected SwapExecutionError"
    except SwapExecutionError as exc:
        assert "Unable to execute route" in str(exc)
