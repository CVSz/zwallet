# CODEX_TASKS_MASTER_FORM.md — Complete Execution Form

This document is the **fully generated execution form** for every checklist item in `CODEX_TASKS.md`.

## Global Four-Role Gate (applies to every item)
- Architect: scope, interfaces/contracts, backward compatibility assessed.
- Builder: minimal diff, no placeholders, compile/build integrity.
- Auditor: security/privacy/config/runtime risk review.
- Tester: relevant tests executed, failures fixed, rerun evidence captured.

## Evidence Fields (required per item)
- Status: `Not started` | `In progress` | `Done` | `Waived`
- Owner:
- Files touched:
- Architect notes:
- Builder notes:
- Auditor notes:
- Tester notes:
- Commands + UTC timestamps:
- Risks / follow-ups:

---

## Section 0 — Program Rules

### 0.1 Enforce execution loop per task
- Source requirement: Analyze → Plan → Implement → Validate → Test → Fix → Output.
- Status: In progress

### 0.2 Ensure all changes are diff-aware
- Source requirement: Read before write.
- Status: In progress

### 0.3 Ban placeholders/TODO stubs
- Source requirement: No placeholder logic in shipped paths.
- Status: In progress

### 0.4 Require tests after behavior changes
- Source requirement: Tests mandatory for changed behavior.
- Status: In progress

### 0.5 Capture command/result evidence
- Source requirement: Record validation evidence per task.
- Status: In progress

---

## Section 1 — Monorepo Foundation

### 1.1 Structure alignment
- 1.1.1 Verify/create target folders (`/apps/android`, `/apps/api`, `/services/wallet-engine`, `/services/swap-engine`, `/services/indexer`, `/packages/crypto-core`, `/packages/chain-adapters`, `/packages/shared-types`).
  - Status: Done
- 1.1.2 Consolidate legacy duplicates with migration notes.
  - Status: Not started

### 1.2 Workspace and strict TypeScript
- 1.2.1 Validate `pnpm-workspace.yaml` includes active workspaces.
  - Status: Done
- 1.2.2 Enforce strict TS in base and overrides.
  - Status: Done
- 1.2.3 Add/verify lint config and workspace scripts.
  - Status: Done
- 1.2.4 Detect/remove circular dependencies.
  - Status: Done

### 1.3 CI foundation
- 1.3.1 Add/verify GitHub Actions lint/test/build matrix.
  - Status: Not started
- 1.3.2 Ensure caching + deterministic lockfile usage.
  - Status: Not started

---

## Section 2 — Contract-First Backbone

### 2.1 API contracts
- 2.1.1 OpenAPI spec for wallet/swap/tx/auth.
  - Status: Not started
- 2.1.2 Version request/response schemas.
  - Status: Not started

### 2.2 Shared validation/types
- 2.2.1 Define Zod schemas at all boundaries.
  - Status: Not started
- 2.2.2 Export schema-derived TS types.
  - Status: Not started
- 2.2.3 Remove `any` / implicit type paths.
  - Status: Not started

### 2.3 Data/event contracts
- 2.3.1 Update Prisma schema.
  - Status: Not started
- 2.3.2 Add event schemas.
  - Status: Not started
- 2.3.3 Add compatibility checks across OpenAPI/Zod/Prisma/events.
  - Status: Not started

---

## Section 3 — Wallet Engine

### 3.1 Core crypto features
- 3.1.1 BIP39 mnemonic flow.
- 3.1.2 BIP44 derivation.
- 3.1.3 EVM/Solana/Bitcoin address derivation.
- Status: Not started

### 3.2 Required functions
- 3.2.1 `deriveAddress()` finalized + chain-tested.
- 3.2.2 `signTransaction()` finalized + chain-tested.
- 3.2.3 `verifySignature()` finalized + chain-tested.
- Status: Not started

### 3.3 Security controls
- 3.3.1 AES-256-GCM for sensitive payloads.
- 3.3.2 Zero plaintext secret persistence.
- 3.3.3 Memory wipe/best-effort cleanup.
- Status: Not started

### 3.4 Tests
- 3.4.1 Valid signature tests.
- 3.4.2 Invalid signature tests.
- 3.4.3 Cross-chain negative tests.
- Status: Not started

---

## Section 4 — Swap Engine
- 4.1 Routing pipeline items (quote adapters, normalization, simulation, deterministic scoring, fallback retries).
- 4.2 Failure handling items (RPC resilience, slippage guards, partial execution recovery).
- 4.3 API endpoint items (`POST /quote`, `POST /execute` contracts + implementation + tests).
- Status: Not started

## Section 5 — Android App
- 5.1 Architecture readiness.
- 5.2 User flows (create/import, send/receive, swap).
- 5.3 Mobile security (Keystore, biometrics, root detection).
- Status: Not started

## Section 6 — Backend API
- 6.1 Stack readiness (NestJS/Prisma/Redis).
- 6.2 Core modules (Auth, Swap orchestration, Tx relay).
- 6.3 Security (Zod validation, rate limits, anti-replay).
- Status: Not started

## Section 7 — Indexer Service
- 7.1 Chain coverage (EVM, Solana WS, BTC UTXO).
- 7.2 Reliability (idempotency, dedupe keys, reorg-safe cursors).
- Status: Not started

## Section 8 — Security Hardening
- 8.1 Mobile controls (TLS pinning, anti-hook/tamper).
- 8.2 Backend controls (Vault secrets, JWT rotation).
- 8.3 Blockchain safety (mandatory simulation).
- 8.4 Security test mandates (replay + invalid signature failures).
- Status: Not started

## Section 9 — DevOps/Runtime
- 9.1 Containerization (Dockerfiles + compose wiring).
- 9.2 Platform deployment (K8s manifests, Terraform plans).
- 9.3 CI pipeline (lint/test/build + artifact retention).
- Status: In progress

## Section 10 — Test Program
- 10.1 Unit tests: wallet engine (Done), swap engine (Not started).
- 10.2 Integration tests: API+DB + service boundaries (Not started).
- 10.3 E2E tests: create wallet, send tx, swap (Not started).
- 10.4 Quality gates: coverage thresholds + deterministic CI (Not started).

## Section 11 — Final Execution
- 11.1 Runtime verification via `docker-compose up` + health checks (Blocked locally: binary unavailable).
- 11.2 Full suite green reruns.
- 11.3 Release evidence package complete.
- Status: In progress

---

## Work Item Record Template (copy for each completed item)

### Work Item ID
`<section.subsection.item>`

### Requirement
<exact checklist text from CODEX_TASKS.md>

### Outcome
<file-level implementation summary>

### Four-Role Evidence
- Architect:
- Builder:
- Auditor:
- Tester:

### Command Evidence (UTC)
- `<timestamp>` — `<command>` — `<result>`

### Risks / Follow-ups
<only real residual items>

---

## Current Baseline Snapshot
- Partial progress: Sections `0`, `1`, `9`, `10`, `11`.
- Mostly not started: Sections `2`, `3`, `4`, `5`, `6`, `7`, `8`.
- Local environment blocker: `docker-compose` unavailable in current container.

- 2026-05-03 23:02 UTC — `pnpm lint` — Passed across all TypeScript workspaces.
- 2026-05-03 23:02 UTC — `pnpm typecheck` — Passed across all TypeScript workspaces.
- 2026-05-03 23:02 UTC — `pnpm check:circular` — Passed; no circular dependencies found.

- 2026-05-03 23:46 UTC — `pnpm lint` — Passed across all TypeScript workspaces.
- 2026-05-03 23:46 UTC — `pnpm typecheck` — Failed in `apps/api` (missing `fastify`, `@fastify/rate-limit`, `zod`; ESM extension + implicit `any` issues).
- 2026-05-03 23:46 UTC — `pnpm check:circular` — Not run due to prior `pnpm typecheck` failure in chained command.
