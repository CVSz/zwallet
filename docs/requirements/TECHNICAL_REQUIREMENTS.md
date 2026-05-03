# zWallet Technical Requirements

## 1. Platform & Runtime
- Backend services run on Node.js 22 with TypeScript.
- API service runs on Python 3.11+ with FastAPI-compatible stack.
- Mobile client runs on React Native/Expo and Android native module integration.

## 2. Service Topology
Required backend services:
- gateway
- wallet-service
- portfolio-service
- tx-orchestrator
- swap-service
- policy-service
- notify-service

## 3. Core Integrations
- Blockchain provider adapter for transaction/balance operations.
- Quote/liquidity provider integration for swaps.
- Push notification provider integration (or compatible abstraction).

## 4. Data & Storage
- Transaction and wallet metadata persistence layer.
- Optional cache layer for high-frequency reads (balances/quotes).
- Secret material must use secure device storage and not be persisted in backend plaintext.

## 5. API & Contract Requirements
- Gateway must expose stable HTTP interfaces for mobile clients.
- Internal service communication should use explicit contracts and typed schemas.
- Error responses must be standardized with machine-readable codes.

## 6. DevOps Requirements
- Local orchestration via Docker Compose.
- Kubernetes deployment manifest(s) for non-local environments.
- CI pipeline should include lint, unit tests, and build checks for backend + mobile targets.

## 7. Testing Requirements
- Unit tests for wallet engine, policy decisions, and transaction orchestration.
- Integration tests for send/swap happy path and rejection scenarios.
- Basic smoke test for gateway and health endpoints.
