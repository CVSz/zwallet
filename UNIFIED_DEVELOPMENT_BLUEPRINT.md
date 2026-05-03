# zWallet Unified Development Blueprint

This document consolidates the Codex agent operating protocol and the zWallet monorepo technical architecture into one actionable implementation reference.

## Phase 0 — Codex Operational Protocol

### Execution Loop (mandatory for every task)
1. Analyze repository state and impacted scope.
2. Plan minimal, reversible changes.
3. Apply targeted patches.
4. Validate compile-time/runtime sanity.
5. Run relevant tests.
6. Fix failures and repeat validation/tests.
7. Output concrete implementation + verification evidence.

### Hard constraints
- Read existing files before writing.
- Modify incrementally with minimal diffs.
- Fix all surfaced errors before moving forward.
- No placeholders, TODO stubs, unused modules, or isolated pseudocode.

## Phase 1 — Infrastructure and Monorepo

### Required workspace structure
- `apps/android`
- `apps/api`
- `services/wallet-engine`
- `services/swap-engine`
- `services/indexer`
- `packages/crypto-core`
- `packages/chain-adapters`
- `packages/shared-types`

### Platform rules
- pnpm workspace management.
- Strict TypeScript enforcement across all workspaces.
- Centralized `tsconfig` + `eslint` configuration.
- No circular dependencies.

### Delivery pipeline
- GitHub Actions must run lint, test, and build.
- Infrastructure stack includes Docker, Kubernetes, and Terraform.

## Phase 2 — Contract-First Development

### Single source of truth
- OpenAPI contracts for REST endpoints.
- Zod runtime schemas at all service boundaries.
- Prisma as canonical database schema.
- Dedicated event schemas for asynchronous flows.

### Type safety requirements
- Shared cross-repo types for all contracts.
- No `any` or implicit types in production paths.

## Phase 3 — Core Engine Implementation

### Wallet Engine
- Multi-chain support: EVM, Solana, Bitcoin.
- Standards: BIP39 mnemonic handling and BIP44 derivation paths.
- Core APIs:
  - `deriveAddress()`
  - `signTransaction()`
  - `verifySignature()`
- Security controls:
  - AES-256-GCM encryption
  - zero plaintext key material at rest
  - proactive memory wiping of sensitive buffers

### Swap Engine
Pipeline requirements:
1. Fetch quotes from upstream aggregators (1inch, Jupiter).
2. Normalize route outputs into canonical format.
3. Simulate transactions before execution.
4. Select best route under policy/slippage constraints.
5. Execute and monitor transaction lifecycle.
6. Fallback safely on partial failures or RPC degradation.

Reliability requirements:
- Robust RPC fallback behavior.
- Slippage guardrails.
- Partial execution handling and recovery paths.

## Phase 4 — Application Layer

### Android app
- Stack: Kotlin + Jetpack Compose with MVVM.
- Features: wallet creation/import, transaction management, swap UI.
- Security: Android Keystore, biometric gate, root detection.
- Implementation reference: `apps/android/README.md`.

### Backend API
- Stack: NestJS + Prisma + Redis.
- Modules: JWT auth with device binding, swap orchestration, tx relaying.
- Security: rate limiting, anti-replay protections, Zod request validation.

## Phase 5 — Indexer and Security Hardening

### Multi-chain indexing
- EVM transfer log tracking.
- Solana websocket monitoring.
- Bitcoin UTXO tracking.
- Idempotent processing with deduplication.

### Global security requirements
- Mobile: TLS pinning and anti-hooking.
- Backend: Vault-based secret handling and JWT rotation.
- Blockchain ops: mandatory pre-broadcast simulation.
- Security test requirements:
  - replay attacks must fail consistently
  - invalid signatures must fail consistently

## Delivery Definition of Done
- Relevant services build and run in workspace.
- `docker-compose up` path is operational for intended stack.
- Relevant e2e flows pass for changed scope.
- Security constraints remain intact.
- Final report includes exact commands and outcomes.
