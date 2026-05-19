# zWallet Repository Full Update

**Date:** 2026-05-04 (UTC)  
**Branch:** `work`  
**Baseline commit:** `6a46616`

## 1) Executive Snapshot

This monorepo is organized as a multi-surface wallet and payments platform with:
- frontend clients (`apps`, `android-app`, `mobile`)
- backend microservices (`backend/services`, `services`, `api`, `apps/api`)
- shared libraries (`packages`, `backend/packages/shared`)
- infra/deployment stacks (`k8s`, `infra`, `terraform`, `docker-compose`)
- architecture and implementation documentation (`docs`, root markdown specs)

The repository already includes security- and resilience-oriented modules (MPC integration, RPC provider pools, KYC/risk/card orchestration paths, and test suites focused on API/integration/security).

## 2) Top-Level Layout

| Path | Role |
|---|---|
| `apps/` | JS application surfaces including `world` and API app workspace |
| `android-app/` | Native Android app (Kotlin + Compose style structure) |
| `mobile/` | Additional mobile app surface with Android bridge |
| `api/` | Python API service (`app/` layered structure + tests) |
| `services/` | TypeScript service set (wallet, swap, router, indexer) |
| `backend/` | Expanded backend microservices domain (gateway, swap, wallet, policy, indexer, etc.) |
| `packages/` | Shared TS packages (`crypto-core`, adapters, shared types) |
| `k8s/` | Base manifests, overlays, monitoring/logging assets |
| `infra/` | Docker and Kubernetes infra resources |
| `terraform/` | AWS Terraform definitions |
| `docs/` | Architecture, security, testing, execution reports |

## 3) Runtime/Tooling Surfaces

### JavaScript/TypeScript workspace
- Root package manager is `pnpm@10.0.0`.
- Root scripts include:
  - recursive typechecking
  - recursive linting
  - circular dependency checks (madge)
  - automated setup script

### Python service surface
- `api/` contains a Python app with layered modules under:
  - `core`
  - `domain`
  - `application`
  - `interfaces/http`
  - `infrastructure`

### Android/Kotlin surface
- Native app code exists under `android-app/app/src/main/java/com/zwallet/...` with security, data, domain, and presentation packages.

## 4) Security, Wallet, and Transaction-Oriented Code Areas

Detected key implementation zones tied to critical product requirements:

- Wallet/signing core:
  - `packages/crypto-core/src/hdWallet.ts`
  - `packages/crypto-core/src/evmSigner.ts`
  - `packages/crypto-core/src/txPipeline.ts`

- MPC + gateway orchestration:
  - `backend/services/gateway/src/services/mpc.ts`
  - `backend/services/gateway/src/services/bundler.ts`
  - `backend/services/gateway/src/lib/rpc-provider-pool.ts`

- Compliance + card + risk orchestration:
  - `backend/services/gateway/src/services/compliance/kyc-service.ts`
  - `backend/services/gateway/src/services/risk/risk-engine.ts`
  - `backend/services/gateway/src/services/card/card-orchestrator.ts`

- Android security boundary modules:
  - `android-app/app/src/main/java/com/zwallet/core/security/KeystoreManager.kt`
  - `android-app/app/src/main/java/com/zwallet/core/security/SecurityGuards.kt`

## 5) Testing and Quality Signals

Repository includes multiple test surfaces:

- TypeScript gateway tests (`backend/services/gateway/test`) covering:
  - RPC/MPC/AA paths
  - security attack paths
  - integration (API + DB)
  - e2e wallet/tx/swap flows

- Wallet engine tests:
  - `services/wallet-engine/test/walletEngine.test.js`

- Python tests:
  - `api/tests/test_swap_orchestrator.py`

- Workspace quality hooks:
  - `pnpm -r run typecheck`
  - `pnpm -r run lint`
  - `madge` circular dependency check

## 6) Deployment and Operations Assets

- Local/compose:
  - `docker-compose.yml`
  - `infra/docker/docker-compose.devops.yml`

- Kubernetes:
  - base deployments/services/HPA under `k8s/base`
  - blue/green overlays under `k8s/overlays`
  - monitoring stack (`k8s/monitoring`)
  - logging stack (`k8s/logging`)

- IaC:
  - Terraform AWS stack under `terraform/aws`

## 7) Documentation Coverage

Current docs include domain-focused guides for:
- wallet engine
- swap engine
- backend API
- indexer
- security
- testing
- devops
- threat modeling
- final execution and review reports

This indicates the repo is documented not just at architecture level but also by subsystem execution phases.

## 8) Repository Health Notes (Current Snapshot)

- The tree includes generated/vendor-heavy directories (`node_modules`, `.gradle`) that should be excluded from architecture metrics unless explicitly needed.
- Core product modules are split between legacy and newer service paths (`services/` and `backend/services/`), so dependency ownership should be validated before cross-cutting refactors.
- Observability and deployment assets are present, supporting production-readiness workflows.

## 9) Suggested Next Operational Checks

1. Run monorepo typecheck/lint in CI mode and capture failing workspaces.
2. Validate gateway integration tests against a deterministic local dependency stack.
3. Reconcile service duplication between `services/` and `backend/services/` with a canonical ownership map.
4. Ensure lockfiles and generated directories are excluded from review diffs and release bundles.

---

Prepared as a repository-wide status update artifact for current branch visibility.
