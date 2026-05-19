# @zwallet/indexer

Indexer primitives for:
- EVM `Transfer` log ingestion
- Solana websocket event ingestion
- BTC UTXO ingestion

## Reliability guarantees

`IndexerDeduper` enforces:
- **Idempotency**: repeated deliveries of the same chain event return `null`.
- **Deduplication**: chain-specific keys are deterministic:
  - EVM: `chainId + blockHash + txHash + logIndex`
  - Solana: `chainId + slot + signature + instructionIndex`
  - BTC: `chainId + blockHash + txid + vout`
- **Reorg-safety**: block hash is included in EVM/BTC keys and cursors.
