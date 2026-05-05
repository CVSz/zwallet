# zWallet Full Repository Deep Review — 2026-05-05

## Scope and method
This review covers the full monorepo topology (`apps`, `services`, `backend/services`, `packages`, `api`, `infra`, `k8s`, `terraform`, `docs`) with focus on production-readiness against the engineering contract in `AGENTS.md`.

Primary method:
- structural inventory from repository file map
- targeted static inspection of critical paths (gateway, transaction pipeline, crypto primitives, card orchestration, RPC resilience)
- policy-gap checks for placeholders/TODOs and loose typing in critical services

## Executive summary
Overall, the repo shows **strong architectural intent** (non-custodial boundaries, multi-RPC quorum/fallback, KYC+risk+liquidity card controls, encryption + memory wiping primitives, broad infra manifests).

However, there is a **material production-readiness gap** between intent and implementation in core runtime paths:
1. Gateway uses extensive `any` and in-memory state for critical financial workflows.
2. Transaction lifecycle path does not perform full pre-broadcast simulation/gas/nonce stages in-line with mandatory pipeline policy.
3. Issuer/KYC integration defaults are dev-friendly but unsafe if not hardened per environment.
4. Repo has overlapping runtime stacks (Node backend, lightweight services, Python API) without one explicit “source of truth” deployment profile.

## What is strong

### 1) Security primitives exist and are aligned
- AES-256-GCM encryption with authenticated tag and per-message salt/IV is implemented in `packages/crypto/src/encryption.ts`.
- Sensitive buffer wiping primitive exists in `packages/crypto/src/memory.ts`.
- Webhook auth includes HMAC + timing-safe compare + nonce replay blocking in gateway.

### 2) RPC resilience pattern is substantive
- `RpcProviderPool` implements provider health tracking, circuit-breaker states, retry with bounded backoff, critical-method quorum, and fallback behavior.
- Quorum disagreement telemetry hook exists.

### 3) Card rails gatekeeping is modeled correctly
- `CardOrchestrator` enforces KYC-full for issuance and requires both risk approval and liquidity pre-funding before auth approval.

### 4) Validation-first edge design is visible
- Gateway routes consistently parse with Zod schemas before use.

## High-risk gaps

### A) Type safety erosion in critical backend surfaces (High)
Core gateway and API code paths contain broad `any` usage across auth, lifecycle, bundler, outbox/audit/fraud paths. This weakens compiler guarantees in high-stakes flows and increases runtime failure and policy bypass risk.

### B) Partial transaction pipeline enforcement (High)
Repository policy requires validation → simulation → gas estimation → nonce management → signing → broadcast → confirmation.
Current lifecycle orchestration demonstrates signature verification and broadcast simulation semantics, but explicit gas estimation and nonce management steps are not enforced in the same flow.

### C) In-memory financial state in gateway flow (High)
The lifecycle and several business flows rely on process memory stores (`store.*`) for balances, transactions, audit-like data, and swap artifacts. This is not durable or horizontally safe for production financial operations.

### D) Environment defaults can degrade security posture (Medium)
Gateway defaults to local Redis and local service base URLs/keys for issuer and KYC. This is useful for local development, but risky if environment hardening checks are missing in deployment.

### E) Multi-stack duplication risk (Medium)
The repo contains multiple partially overlapping implementations (`backend/services/*`, `services/*`, `apps/api`, `api/`). Without a strict deployment authority matrix, teams risk drift in controls and inconsistent behavior.

## Policy conformance snapshot (AGENTS.md)

- **No placeholder/TODO in shipped paths:** not fully satisfied (placeholder/TODO comments found in runtime/admin paths).
- **Idempotency for financial/event operations:** partially satisfied (some idempotency keys present; not consistently pervasive).
- **Simulation before chain execution:** partially satisfied in design and some flows, but not uniformly explicit across lifecycle code path.
- **Multi-RPC and fallback:** substantively implemented in gateway RPC pool.
- **KYC+risk+liquidity for card auth:** implemented in card orchestration.

## Prioritized remediation plan

### P0 (immediate)
1. Replace `any` in gateway/API critical transaction/payment paths with explicit DTO/domain types.
2. Make transaction pipeline stages explicit and mandatory in code path: preflight simulation + gas cap checks + deterministic nonce manager.
3. Move gateway financial state/audit artifacts from in-memory store to durable, transactional persistence.

### P1 (next)
4. Add startup hard-fail checks for insecure defaults in non-dev environments (issuer keys, KYC provider key/base URL, Redis URL, webhook secret).
5. Define and document one production control plane (recommended: `backend/services/gateway` stack) and mark alternates as experimental/reference.

### P2 (follow-up)
6. Expand negative-path integration tests for quorum disagreement, fallback exhaustion, nonce collision, and partial downstream service outage.
7. Add policy-as-code lint/check to block `TODO/placeholder` markers in production-scoped directories.

## Suggested quality gate additions
- CI rule: fail on `any` usage in designated critical folders unless explicitly waived.
- CI rule: fail if transaction pipeline module does not emit all required stage markers.
- CI rule: fail on insecure env defaults outside `NODE_ENV=development`.
- CI rule: fail on placeholder/TODO markers in runtime production directories.

## Conclusion
The repository is **architecturally mature**, but **operationally pre-production** in several critical paths. With P0 items completed, the platform can move from “strong design prototype” to “hardened production candidate.”
