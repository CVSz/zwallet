# zWallet Master Meta Deep Review — 2026-05-05

## Summary
This report is a full-repo meta review focused on production hardening readiness against `AGENTS.md` constraints (security-first, deterministic tx pipeline, idempotency, multi-RPC resilience, no placeholder runtime logic).

Overall status: **Architecturally strong, operationally not yet production-safe in several critical paths**.

## Scope inspected
- Architecture and top-level intent: `README.md`, `ARCHITECTURE.md`
- Core backend runtime: `backend/services/gateway/src/*`
- Wallet/crypto primitives: `packages/crypto/src/*`, `packages/crypto-core/src/*`
- Service slices: `services/*`, `api/*`, `apps/api/*`
- Infra manifests: `k8s/*`, `terraform/*`
- Existing audit docs in `docs/`

## What is working well
1. **Security primitives exist in codebase**
   - Authenticated encryption and memory wiping utilities are present in crypto packages.
2. **Resilience intent is present**
   - Multi-RPC/fallback/circuit-breaker patterns are present in gateway-related implementation and docs.
3. **Policy-aware domain modeling exists**
   - Card flow requirements (KYC, risk, liquidity) and swap safety constraints are represented in architecture/docs.
4. **Infra readiness assets are broad**
   - Kubernetes, Terraform, monitoring/logging manifests exist and are reasonably structured.

## High-impact risks (ranked)

### P0 — Must fix before production
1. **Critical-path type safety erosion**
   - `any` usage remains widespread in sensitive code paths (measured count shows significant presence).
   - Risk: runtime ambiguity and bypassable invariants in financial flows.

2. **Transaction lifecycle not uniformly enforcing mandatory stages**
   - AGENTS policy requires strict sequence: validation → simulation → gas estimation → nonce management → signing → broadcast → confirmation.
   - Current implementation appears partially enforced depending on path.

3. **In-memory financial state in gateway path**
   - Runtime state persists in process memory structures for balances/tx lifecycle artifacts.
   - Risk: non-durable state, horizontal scaling inconsistencies, restart loss.

### P1 — Harden next
4. **Dev defaults can leak into deployment posture**
   - Local/default environment assumptions need non-dev hard-fail guards.

5. **Multi-stack authority ambiguity**
   - Parallel implementations (Node microservices, lightweight services, Python API) increase drift risk without a single declared production authority stack.

### P2 — Reliability maturity
6. **Idempotency and failure-path tests are uneven**
   - Additional integration tests needed for RPC degradation, nonce contention, and partial dependency outages.

## Evidence snapshots from static checks
- Placeholder/TODO markers exist in scoped runtime trees.
- `any` usage remains non-trivial in TS surfaces.
- Gateway code path uses in-memory mutable stores in transaction and balance-adjacent flows.

## Compliance scorecard vs AGENTS.md
- Simulation before execution: **Partial**
- Financial idempotency: **Partial**
- No placeholders/TODO in production runtime: **Partial/Fail**
- Multi-RPC/fallback: **Pass (design + implementation intent)**
- Security-first architecture boundary (signing client/MPC): **Pass (intent), Partial (enforcement proof needed)**

## Recommended execution plan

### Sprint A (P0 hardening)
1. Replace critical `any` with explicit DTO/domain types in gateway tx/card/swap endpoints.
2. Introduce a single transaction orchestrator pipeline module that enforces all mandatory stages with machine-checkable stage markers.
3. Migrate in-memory financial lifecycle/balance state to durable ACID-backed storage with idempotency keys.

### Sprint B (P1 convergence)
4. Add startup policy guardrails: refuse boot in non-dev when secrets/defaults are unsafe.
5. Publish a production authority matrix (`docs/`) naming canonical deploy path and deprecating alternates.

### Sprint C (P2 confidence)
6. Add targeted integration/failure tests: RPC quorum split, fallback exhaustion, nonce races, liquidity depletion, issuer outage.
7. Add CI policies: critical-folder `any` budget, forbidden TODO/placeholders, mandatory tx-stage telemetry assertions.

## Final verdict
zWallet has strong production architecture direction and good security primitives, but **critical runtime hardening remains** before production designation. Prioritize P0 items immediately to align runtime guarantees with documented policy.
