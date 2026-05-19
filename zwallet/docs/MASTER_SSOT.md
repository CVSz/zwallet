# 🧠 zWallet MASTER SINGLE SOURCE OF TRUTH (SSOT)

## System Identity
- Type: Distributed Fintech Core
- Model: Event-driven + Double-entry Ledger
- Guarantee: Financial correctness over availability

---

## Core Laws (Non-Negotiable)
1. SUM(entries.amount) == 0 per transaction
2. All events must be idempotent
3. No trust without verification (zero-trust)
4. All side effects via events
5. Ledger = single source of truth

---

## Architecture

Client → Istio Gateway → API → Ledger (Postgres HA) → Outbox → Kafka → Workers → Redis → SIEM

---

## Core Components

### Ledger
- Immutable
- Double-entry enforced
- DB constraint required

### Events
- Outbox pattern
- Kafka
- Idempotent consumers

### Security
- Unified pipeline
- Risk scoring
- Shadow ban

### Identity
- Derived from IP + UA + behavior
- No header trust

### Infra
- Kubernetes + Helm ONLY (production)
- Postgres: Patroni
- Redis: Cluster
- Vault: secrets
- Istio: mTLS

### Observability
- JSON logs → Filebeat → Elasticsearch → Kibana → Alerts

---

## Deployment Model
- Dev: docker-compose
- Staging: k8s
- Prod: Helm only

---

## Codex Prompts (Final)

- enforce ledger invariants
- enforce idempotency globally
- unify security pipeline
- enforce vault secrets
- enforce mTLS strict
- run chaos validation
- run load validation

---

## Final Statement

This document is the ONLY source of truth.
Any implementation must conform strictly.

