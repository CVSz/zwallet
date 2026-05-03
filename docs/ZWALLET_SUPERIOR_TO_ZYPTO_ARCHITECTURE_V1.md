# zWallet Superior-to-Zypto Architecture Spec v1

## 1. Scope and Design Objectives

This specification defines a production architecture for a multi-chain, non-custodial crypto super-app that exceeds a Zypto-like model in security posture, decentralization-resilience, route quality, and operational control.

### Primary objectives
- Preserve strict client-side key custody (no server-side private key boundary crossing).
- Provide high-reliability wallet, swap, payment, and rewards services under regional compliance constraints.
- Improve execution quality with intent-based, MEV-aware routing and deterministic risk controls.
- Couple token rewards to measurable protocol usage while maintaining sustainability controls.
- Scale from MVP to global multi-region deployment without architectural rewrites.

### Explicit non-goals
- Custodial wallet operations.
- Unbounded reward emissions disconnected from real revenue.
- Single-provider dependencies for RPC, swaps, cards, or fiat rails.

---

## 2. Service Boundaries

## 2.1 Client and Edge

### Android/iOS Client (non-custodial trust anchor)
**Owns**
- Seed generation/import, local encryption, biometric-gated unlock, chain account derivation.
- Local transaction signing for EVM/Solana/BTC compatible formats.
- Session-scoped authorization and secure telemetry opt-in.

**Never owns**
- Business rules requiring server consensus (limits, sanctions decisions, reward accrual finalization).

### API Gateway (public edge)
**Owns**
- mTLS/TLS termination, JWT validation, per-tenant and per-device rate limits.
- Canonical request schemas, idempotency keys, abuse throttling.
- Request fan-out and circuit-breakers to internal services.

**Never owns**
- Chain logic, quote scoring, or transaction state machines.

---

## 2.2 Core Domain Services

### Identity & Policy Service
- User/device identity binding, tenant plan entitlements, geo policy enforcement.
- Transaction policy evaluation: amount limits, velocity checks, chain risk flags.

### Wallet Registry Service
- Public wallet registry (`wallet_id`, chain address set, derivation fingerprints, labels).
- Address gap discovery and watchlist management.

### Transaction Orchestrator
- Creates canonical transaction intents and unsigned payloads.
- Validates signed payloads, broadcasts via chain adapters, manages retries.
- Owns transaction lifecycle state machine (`created -> signed -> broadcasted -> confirmed|failed`).

### Swap Intent & Routing Service
- Quote ingestion across DEX aggregators and native solvers.
- Intent normalization, route simulation, slippage bounds, expiry guarantees.
- MEV-protection policy selection (private relays / batch / intent settlement modes).

### Payments Rail Service
- Card/bill-pay/mobile-topup connector abstraction.
- Provider failover and reconciliation jobs.
- Fiat/crypto settlement bookkeeping and dispute hooks.

### Rewards & Tokenomics Service
- Revenue ingestion from swap fees, card/payment margins, and partner rebates.
- Daily reward computation, epoch closure, merkle distribution outputs.
- Circuit-breakers for reserve depletion and volatility events.

### Treasury & Liquidity Service
- Inventory/risk accounting by chain/asset/region.
- Rebalancing policies and liquidity stress controls.

### Notification Service
- Event-driven push/email/webhook notifications for tx, rewards, and compliance events.

---

## 2.3 Platform and Data Plane

### Chain Adapter Services (EVM/Solana/BTC)
- Unified interfaces for estimate/build/broadcast/status.
- RPC quorum, fallback logic, and provider health scoring.

### Indexer Services
- Chain event ingestion for balances, transfers, confirmations, token metadata drift.

### Data Stores
- **PostgreSQL**: authoritative transactional records.
- **Redis**: ephemeral cache (quotes, nonce hints, session controls).
- **Object storage**: immutable audit artifacts and reconciliation snapshots.
- **Event streaming (NATS/Kafka)**: async domain events and replayable workflows.

---

## 3. Trust and Security Model

## 3.1 Trust boundaries
- **Boundary A (Device):** private keys remain encrypted locally and never transmitted.
- **Boundary B (Edge/API):** authenticated intent ingress only; no signing material accepted.
- **Boundary C (Execution Core):** policy, routing, and broadcast decisions are server-side deterministic.
- **Boundary D (External providers):** treated as untrusted dependencies; all inputs revalidated.

## 3.2 Required controls
- Hardware-backed key storage, anti-tamper and root/jailbreak detection.
- Payload integrity: deterministic intent hash + expiry + chain replay domain.
- mTLS for internal service-to-service traffic; short-lived workload identity.
- Strict PII/token redaction in logs; structured audit trails with field-level masking.
- Secrets in KMS/HSM-backed managers; no plaintext secrets in env files or logs.
- Dependency posture: signed images, SBOM generation, vulnerability gates in CI.

## 3.3 Abuse and adversarial resilience
- Risk-scored throttling by account, IP, device fingerprint, and tenant.
- Quote poisoning defense: source diversity, deviation thresholds, and stale route rejection.
- Broadcast safety: nonce/UTXO conflict guards, replacement logic, duplicate submission suppression.
- Payment fraud controls: velocity ceilings, sanctions checks, delayed settlement for high-risk cohorts.

---

## 4. Tokenomics Control Loops

## 4.1 Economic flow model
- Inputs: swap fee share, payment processing margin, partner rebates, optional donations.
- Allocation target (policy-driven, adjustable by governance):
  - Rewards pool (e.g., 33%)
  - Foundation/treasury growth (e.g., 33%)
  - Ops/liquidity/risk reserves (remainder)

## 4.2 Control loops (closed-loop design)

### Loop A: Reward Emission Stabilizer
- Objective: keep rewards sustainable under volume volatility.
- Inputs: 7d/30d net protocol revenue, reserve ratio, token volatility, active users.
- Output: next epoch emission multiplier.
- Guardrails: hard floor/ceiling + emergency brake when reserve ratio drops below threshold.

### Loop B: Liquidity Health Controller
- Objective: maintain payout and swap settlement reliability.
- Inputs: asset inventory skew, provider settlement latency, withdrawal pressure.
- Output: rebalance actions, temporary fee spread adjustments.

### Loop C: User Growth Efficiency
- Objective: maximize retained activity per reward unit.
- Inputs: cohort retention, reward claim-to-usage ratio, CAC proxy metrics.
- Output: segmented reward weighting (new users vs power users vs dormant reactivation).

### Loop D: Risk-Off Governance Switch
- Objective: protect solvency during stress events.
- Trigger examples: extreme volatility, provider outage, regulatory hold.
- Actions: reduce emissions, tighten limits, disable risky routes, increase confirmations required.

## 4.3 Verifiability and governance
- Epoch outputs published with reproducible inputs and merkle roots.
- On-chain or publicly auditable attestation of reward calculations.
- Governance proposals modify parameters only through controlled rollout windows.

---

## 5. Infrastructure Topology

## 5.1 Runtime topology
- Multi-region Kubernetes deployment: `us-east`, `eu-west`, `ap-southeast` baseline.
- Active-active read paths; active-passive or active-active write strategy per domain criticality.
- Global traffic steering with health/latency policy.

## 5.2 Network segmentation
- Public ingress zone: API gateway and WAF.
- Service zone: core microservices with service mesh identity.
- Data zone: managed databases, caches, and object storage on private subnets.
- Restricted zone: KMS/HSM and compliance processing workers.

## 5.3 Reliability SLOs
- API availability: 99.95% monthly.
- Quote freshness p95 under target TTL window.
- Broadcast success p99 with fallback provider path.
- Reward epoch finalization within deterministic execution window.

## 5.4 Observability and operations
- OpenTelemetry end-to-end traces with tenant-safe correlation IDs.
- SLI dashboards: quote hit ratio, route failure rate, broadcast latency, payout backlog.
- Incident automation: runbooks, auto-mitigation toggles, and postmortem templates.

## 5.5 Supply chain and deployment
- CI: lint, unit/integration/e2e, SAST/DAST, dependency and image scanning.
- CD: progressive delivery (canary -> staged ramp -> full rollout).
- Policy-as-code gates for secrets, network, and IAM drifts.

---

## 6. Phased Delivery Roadmap (MVP to Scale)

## Phase 0 — Foundations (2-4 weeks)
- Monorepo standards, contract-first APIs, shared types.
- Base CI/CD, observability baseline, secret management and IAM hardening.
- Threat model and abuse model ratified.

## Phase 1 — MVP Wallet + Basic Swap (6-10 weeks)
- Non-custodial mobile wallet for EVM + Solana.
- Transaction orchestrator and chain adapters with fallback RPC.
- Single-aggregator swap quotes with deterministic execution checks.
- Initial rewards accrual ledger (no aggressive emissions).

**Exit criteria**
- End-to-end send/receive/swap paths pass e2e in staging.
- Key security controls verified (no key egress, redaction, audit trails).

## Phase 2 — Production Hardening (8-12 weeks)
- Multi-aggregator routing, route simulation, MEV-protection modes.
- Payment rails integration (card/top-up) via abstracted providers.
- Tokenomics Loop A/B enabled with conservative caps.
- Multi-region failover, chaos tests, reconciliation automation.

**Exit criteria**
- SLO dashboards stable for 30 days.
- Reward epochs reproducible and auditable.

## Phase 3 — Growth and Governance (10-16 weeks)
- Advanced segmentation rewards (Loop C), governance parameterization.
- Treasury and liquidity risk automation.
- Compliance expansion by region and policy bundles.

**Exit criteria**
- Governance-controlled parameter changes with safe rollout.
- Demonstrated reserve health under stress simulation scenarios.

## Phase 4 — Scale and Differentiation (ongoing)
- Intent-based solver network integration and proprietary routing.
- Account abstraction/MPC options for seedless UX tier.
- Cost/performance optimization, partner ecosystem APIs.

**Exit criteria**
- Superior execution quality and retention metrics vs baseline competitor benchmarks.

---

## 7. Acceptance Criteria for v1 Spec Completion
- Service contracts are mapped to concrete repos/modules and owned teams.
- Security controls are testable with explicit validation procedures.
- Tokenomics loops have measurable inputs, outputs, and emergency bounds.
- Infrastructure SLOs and operational gates are defined and monitorable.
- Roadmap phases have unambiguous exit criteria.
