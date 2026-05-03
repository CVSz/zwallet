# zWallet Full-Stack Reference Implementation

This repository now contains a runnable **full-stack scaffold** aligned to `ARCHITECTURE.md`:

- `backend/` — Node.js 22 + TypeScript microservices:
  - `gateway` (Fastify API edge)
  - `wallet-service`
  - `portfolio-service`
  - `tx-orchestrator`
  - `swap-service`
  - `policy-service`
  - `notify-service`

- `indexer-service`
  - multi-chain workers for EVM (Alchemy/Infura/self-node), Solana RPC, and Bitcoin node/API ingestion
  - event-driven, idempotent batch jobs for balance tracking + transaction monitoring
  - queue publisher abstraction for NATS/Kafka-backed WebSocket push updates
- `mobile/` — React Native/Expo client (placeholder for Android-native migration path).
- `infra/` — Docker Compose + K8s manifests.

## Quick start

```bash
cd backend
npm install
npm run dev
```

In another shell:

```bash
cd mobile
npm install
npm start
```
## Requirements Documentation

Project requirement documents are available in `docs/requirements/`:
- `PRODUCT_REQUIREMENTS.md`
- `NON_FUNCTIONAL_REQUIREMENTS.md`
- `TECHNICAL_REQUIREMENTS.md`


## Production flow (fully wired)

The gateway now orchestrates an end-to-end transactional flow:

`Wallet → Sign → Swap → Broadcast → Index → Display`

Single API entrypoint:
- `POST /v1/flow/wallet-sign-swap` (gateway)

It fan-outs to: wallet-service, policy-service (pre-sign risk policy), swap-service (quote + execute), indexer-service (batch indexing), and portfolio-service (final display projection).

## Deployment

Run all services with docker compose:

```bash
docker compose up --build
```

Gateway is exposed on `:8080`. All inter-service URLs are configured via `backend/.env.example`.

## Repository status (May 2026)

This repo is a **working reference scaffold**, not a production wallet yet. The fastest path to product quality is to harden a few critical layers in sequence.

### Critical-path build order

1. **Wallet signing pipeline first**
   - Android/device key custody (hardware-backed)
   - deterministic tx construction + nonce/sequence handling
   - local signing + controlled relay + broadcast verification
2. **Chain adapter abstraction**
   - stable interface for EVM/Solana/Bitcoin
   - shared transaction lifecycle + per-chain implementations
3. **Indexer + portfolio correctness**
   - chain-native ingestion workers and reorg-safe reconciliation
   - normalized balances + tx history projection
4. **Swap execution engine**
   - quote aggregation, simulation, slippage controls, retry/fallback routes
5. **Security hardening + scale**
   - keystore/enclave usage, TLS pinning, anti-tamper/root checks
   - caching, rate limiting, observability, incident playbooks

### Suggested monorepo target layout

```txt
/apps
  /android
  /backend
/services
  /wallet-engine
  /swap-engine
  /indexer
  /pricing
/packages
  /crypto-core
  /chain-adapters
  /types
/infra
  /docker
  /k8s
  /terraform
```

### Current milestone checklist

- [ ] End-to-end signed transfer on at least one EVM network
- [ ] End-to-end signed transfer on Solana
- [ ] Replay/nonce protections with integration tests
- [ ] Unified chain adapter contract with EVM + Solana implementations
- [ ] Reorg-aware indexing and tx history API
- [ ] Pre-trade swap simulation and risk checks
- [ ] Mobile security controls (keystore, pinning, root detection)
- [ ] CI pipeline with lint/test/build + container smoke tests

## Discoverability

If this repository is not appearing in search/discovery as expected:

- ensure the repository is public and indexed on GitHub
- keep this README updated with concrete architecture + run instructions
- add release tags and a short project description in repository settings
- publish a minimal roadmap/issues board so maturity is visible externally



## Docker end-to-end validation

From repository root:

```bash
docker compose up --build -d
```

Then run the required validation tests:

```bash
cd backend
npm install
npm run test:tx-flow
npm run test:swap-flow
```

Expected result:
- `test:tx-flow` completes wallet transaction lifecycle checks (happy path + error branches).
- `test:swap-flow` completes wallet -> sign -> swap -> broadcast -> index -> portfolio flow.

When finished:

```bash
docker compose down -v
```
