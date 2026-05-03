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
