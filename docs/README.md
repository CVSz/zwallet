# zWallet Documentation Index

This index provides a clean entrypoint to project documentation and recommended reading order.

## Start Here

1. `00_AGENT_CONTRACT.md` — engineering execution contract and delivery constraints.
2. `01_MONOREPO_INIT.md` — repository bootstrap and baseline setup.
3. `02_CONTRACT_FIRST.md` — contract-first development model.
4. `03_WALLET_ENGINE.md` — wallet engine architecture and boundaries.
5. `04_SWAP_ENGINE.md` — swap engine behavior and integration model.
6. `05_ANDROID_APP.md` — Android client architecture and security controls.
7. `06_BACKEND_API.md` — API layer responsibilities and request lifecycle.
8. `07_INDEXER.md` — indexing pipeline and chain event processing.
9. `08_SECURITY.md` — security model and control expectations.
10. `09_DEVOPS.md` — deployment and operational controls.
11. `10_TESTING.md` — test strategy and quality gates.
12. `11_FINAL_EXECUTION.md` — release execution checklist.

## Requirements

- `requirements/PRODUCT_REQUIREMENTS.md`
- `requirements/TECHNICAL_REQUIREMENTS.md`
- `requirements/NON_FUNCTIONAL_REQUIREMENTS.md`

Technical requirements include the repository's Deep Think constraints for transaction safety, RPC resiliency, and idempotent financial/event processing.

## Security Deep Dive

- `security/THREAT_MODEL.md`

## Program and Review Documents

- `DEVOPS_PIPELINE.md`
- `REVIEW_PREVIEW_REPORT.md`
- `BUG_REVIEW_2026-05-03.md`

## Consolidated Architecture Principles (merged from former `ZWALLET_SUPERIOR_TO_ZYPTO_ARCHITECTURE_V1.md`)

- **Trust boundary**: private keys remain client-side only; no server-side key custody.
- **Core domain services**: API gateway, policy, wallet registry, tx orchestrator, routing, payments, rewards, treasury, and notifications with deterministic responsibilities.
- **Data plane**: Postgres (source of truth), Redis (ephemeral), object storage (immutable artifacts), and event streaming for async workflows.
- **Security controls**: mTLS service mesh, strict redaction, KMS/HSM-backed secret handling, signed artifacts/SBOM, and abuse controls.
- **Reliability topology**: multi-region runtime, segmented network zones, health-based traffic steering, and SLO-backed observability.
- **Tokenomics control loops**: emission stabilizer, liquidity health control, growth efficiency control, and risk-off governance switches.
- **Delivery roadmap**: phased MVP → hardening → governance → scale progression with explicit exit criteria.

## Root-Level Companion Docs

- `../ARCHITECTURE.md`
- `../UNIFIED_DEVELOPMENT_BLUEPRINT.md`
- `../CODEX_TASKS.md`
- `../CODEX_TASKS_MASTER_FORM.md`
