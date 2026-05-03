# zWallet

zWallet is a multi-chain wallet and swap platform focused on secure, non-custodial transaction flows for EVM, Solana, and Bitcoin.

## Repository Layout

- `apps/` — user-facing applications (Android and API entrypoints).
- `services/` — backend services (wallet, swap, indexer, orchestration).
- `packages/` — shared libraries, adapters, and types.
- `infra/` — infrastructure, deployment, and operations assets.
- `docs/` — architecture, requirements, security, and execution guides.

## Quick Start

### Start local stack

```bash
docker-compose up --build
```

### Run tests

```bash
npm test
```

## Documentation

- High-level architecture: `ARCHITECTURE.md`
- Documentation index: `docs/README.md`
- Current review snapshot: `docs/REVIEW_PREVIEW_REPORT.md`

## Security Principles

- Private keys remain on the client side and are never transmitted to backend services.
- Signing operations are performed on-device.
- Services validate and enforce policy before accepting broadcast requests.
