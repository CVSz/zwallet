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

## 8. Deep Think Repository Requirements

### 8.1 Transaction Safety Pipeline
- Every outbound blockchain transaction must execute this sequence: input validation, simulation/dry-run, gas estimation, nonce management, signing, broadcast, confirmation tracking.
- Transactions must be rejected when simulation fails or configured gas spike thresholds are exceeded.

### 8.2 RPC Trust & Resilience
- Chain operations must use multi-provider RPC routing with failover.
- Circuit breakers, request timeouts, and bounded retries are required for every external RPC call.
- Single-endpoint RPC dependency is not allowed in production paths.

### 8.3 Financial & Event Idempotency
- All payment, card, and chain submission endpoints must accept idempotency keys.
- Async jobs must support safe retries and deduplication keys.
- Reprocessing an already-completed financial event must produce a deterministic no-op response.

### 8.4 Wallet Signing Boundaries
- Private keys must remain in client-side secure storage or MPC boundaries only.
- Backend services are orchestration-only and must never persist raw seed/private key material.
- Signing logic must verify chain ID and nonce before signature emission.
