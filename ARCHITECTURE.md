# zWallet Full-Stack Multi-Chain Architecture

## 1) Goals and Non-Goals

### Goals
- Multi-chain wallet support for **EVM**, **Solana**, and **Bitcoin**.
- Non-custodial key management with deterministic HD derivation.
- Low-latency swaps via chain-specific aggregators (1inch, Jupiter, Uniswap pathing).
- Tenant-aware scaling and strict workload isolation.
- High observability and fault-tolerant service mesh-like behavior.

### Non-Goals
- Custodial key storage.
- Centralized exchange order-book trading.
- Cross-chain bridge custody (only route execution and transaction orchestration).

---

## 2) System Diagram

```mermaid
flowchart TB
  subgraph Client[Android App - Kotlin + Jetpack Compose]
    UI[Wallet UI]
    Vault[Android Keystore + Encrypted Seed Vault]
    Signer[On-device Signing Engine]
  end

  subgraph Edge[API Edge]
    GW[API Gateway - Fastify]
    Auth[Auth + Tenant Resolver]
    RL[Rate Limiter]
  end

  subgraph Core[Core Services - Node.js TypeScript]
    WalletSvc[Wallet Service\n(Accounts/Addresses/XPUB refs)]
    PortfolioSvc[Portfolio Service\n(Balances/Positions)]
    TxOrch[Transaction Orchestrator]
    SwapSvc[Swap Engine Service]
    PolicySvc[Risk/Policy Service]
    NotifySvc[Notification Service]
  end

  subgraph Chain[Blockchain Connectivity Layer]
    EVMRel[EVM Relayer/Indexer]
    SolRel[Solana Relayer/Indexer]
    BTCRel[Bitcoin Relayer/Indexer]
    RPCPool[RPC Provider Pool\n(Primary/Fallback)]
  end

  subgraph Data[Data Plane]
    PG[(PostgreSQL)]
    Redis[(Redis)]
    NATS[(NATS JetStream)]
  end

  subgraph Obs[Observability]
    OTel[OpenTelemetry Collector]
    Prom[Prometheus]
    Graf[Grafana]
    Loki[Loki/Logs]
  end

  subgraph Infra[Platform]
    K8s[Kubernetes]
    TF[Terraform]
    Docker[Docker Images]
  end

  UI --> GW
  GW --> Auth --> RL
  RL --> WalletSvc
  RL --> PortfolioSvc
  RL --> TxOrch
  RL --> SwapSvc

  WalletSvc --> PG
  PortfolioSvc --> Redis
  PortfolioSvc --> PG
  TxOrch --> NATS
  SwapSvc --> Redis
  SwapSvc --> NATS
  PolicySvc --> PG
  NotifySvc --> NATS

  TxOrch --> EVMRel
  TxOrch --> SolRel
  TxOrch --> BTCRel
  EVMRel --> RPCPool
  SolRel --> RPCPool
  BTCRel --> RPCPool

  WalletSvc --> OTel
  PortfolioSvc --> OTel
  TxOrch --> OTel
  SwapSvc --> OTel
  OTel --> Prom
  OTel --> Loki
  Prom --> Graf

  K8s --> GW
  K8s --> Core
  K8s --> Chain
  TF --> K8s
  Docker --> K8s
```

---

## 3) Service Boundaries

## Android Native App (Kotlin + Jetpack Compose)
**Responsibilities**
- Account onboarding, seed phrase UX, biometric unlock.
- Local key derivation (BIP-32/39/44 + SLIP-0010/ed25519 for Solana).
- Local transaction signing; server never gets raw private keys.
- Real-time portfolio + quote display.

**Hard boundary**
- App can request payload-to-sign from backend, but signs only on device.

## API Gateway (Fastify)
**Responsibilities**
- JWT validation + tenant context injection (`tenant_id`, plan, region).
- Request shaping, rate limiting, schema validation.
- Circuit breaking around downstream services.

## Wallet Service
**Responsibilities**
- Public account registry (wallet IDs, chain addresses, XPUB fingerprints).
- Address gap management and discovery jobs.
- Chain capability matrix per tenant.

## Portfolio Service
**Responsibilities**
- Balance fetch and normalization across chains.
- Token metadata cache and fiat valuation snapshots.
- Read-optimized APIs for mobile.

## Transaction Orchestrator
**Responsibilities**
- Build canonical unsigned transaction payloads.
- Validate nonce/UTXO/blockhash consistency pre-sign.
- Accept signed tx, perform final checks, broadcast, and track lifecycle.

## Swap Engine Service
**Responsibilities**
- Quote fan-out to 1inch/Jupiter/Uniswap routing APIs.
- Route scoring: effective output, gas, slippage risk, fill probability.
- TTL-bound quote locks and execution intent creation.

## Blockchain Layer
**Responsibilities**
- Chain adapters (EVM/Solana/BTC) unify `build/signable/broadcast/status` interfaces.
- RPC quorum + fallback providers with health scoring.
- Mempool and confirmation subscriptions.

## Data + Messaging
- **PostgreSQL**: source of truth (tenants, wallets, intents, tx state machine).
- **Redis**: hot cache (quotes, nonce hints, token metadata, rate limits).
- **NATS JetStream**: async workflows (broadcast events, confirmations, retries).

## Observability
- OpenTelemetry spans/metrics/log correlation.
- Prometheus SLO dashboards.
- Grafana alerting on latency, error budgets, chain health.

---

## 4) Data Flow (wallet → signing → broadcast)

1. **Create intent**
   - Mobile requests transfer/swap intent with tenant-scoped JWT.
   - API validates policy + risk limits.

2. **Build unsigned payload**
   - Transaction Orchestrator queries chain adapter:
     - EVM: gas params + nonce + calldata.
     - Solana: recent blockhash + instruction set.
     - BTC: coin selection + fee rate + PSBT.

3. **Return signable payload to device**
   - Payload contains deterministic hash, expiry, and anti-replay context.

4. **On-device signing**
   - App unlocks seed via hardware-backed keystore.
   - Derives per-chain account path and signs locally.

5. **Submit signed tx**
   - Signed blob sent to `/tx/submit` with intent ID + idempotency key.

6. **Pre-broadcast validation**
   - Orchestrator verifies signature format, chain rules, and stale-quote/blockhash/nonce conditions.

7. **Broadcast**
   - Chain adapter sends tx to primary RPC; retries/fallback on failure.
   - Emits `tx.broadcasted` event to NATS.

8. **Lifecycle tracking**
   - Indexers stream pending/confirmed/failed updates.
   - Transaction state machine persisted to PostgreSQL.
   - Push notification emitted on confirmation/failure.

---

## 5) Threat Model (Attack Surfaces)

## A. Client-side risks
- Seed phrase exfiltration (malware, screen capture, clipboard leaks).
- Runtime hooking / rooted device tampering.
- Biometric bypass attempts.

**Mitigations**
- Hardware-backed key encryption, `FLAG_SECURE`, root/jailbreak detection, strict no-clipboard seed policy.

## B. API and auth risks
- JWT replay, token theft, tenant confusion attacks.
- Abuse via quote spam and tx spam.

**Mitigations**
- Short-lived access tokens + refresh rotation, per-tenant/per-IP limits, idempotency tokens, mTLS internal traffic.

## C. Swap manipulation risks
- MEV sandwich exposure, stale quote execution, route poisoning.
- Malicious token metadata spoofing.

**Mitigations**
- Slippage guardrails, quote TTL, simulation before submit, token allowlist/verified registry per tenant.

## D. Chain connectivity risks
- RPC censorship/outage/data inconsistency.
- Incorrect fee estimates leading to stuck tx.

**Mitigations**
- Multi-provider quorum reads, adaptive fee bumping, regional RPC pools, automatic failover.

## E. Data plane risks
- SQL injection, cache poisoning, queue flooding.

**Mitigations**
- Strict schema validation, parameterized queries, signed cache keys for sensitive derived values, dead-letter queues + rate caps.

## F. Operational risks
- Noisy-neighbor across tenants.
- Cascading failures during chain incidents.

**Mitigations**
- Namespace/resource quotas, tenant sharding, bulkheads and circuit breakers, degraded-read mode.

---

## 6) Multi-Tenant Scalability Design

- **Tenant isolation model**:
  - Shared control plane, partitioned data plane by `tenant_id`.
  - Optional dedicated worker pools for enterprise tenants.

- **Data partitioning**:
  - PostgreSQL: partition large tables (`transactions`, `balances`) by tenant + time.
  - Redis: key prefixing `t:{tenant}:{domain}:{key}` and per-tenant TTL policies.

- **Compute isolation**:
  - Kubernetes HPA per service and per queue consumer group.
  - Pod anti-affinity and priority classes to protect critical paths.

- **Rate governance**:
  - Tenant-level QPS and monthly compute budget enforcement.

---

## 7) Fault Isolation Strategy

- **Bulkheads**: separate deployments for swap, tx orchestration, and indexers.
- **Circuit breakers**: per-provider and per-chain tripping.
- **Retry strategy**: exponential backoff + jitter, DLQ after bounded retries.
- **Graceful degradation**:
  - If swap backends degrade: keep wallet transfer features online.
  - If portfolio indexers lag: serve cached balances with staleness marker.

---

## 8) Latency Optimization for Swaps

- Parallel quote fan-out to 1inch/Jupiter/Uniswap connectors.
- Redis quote cache keyed by `(chain, tokenIn, tokenOut, amountBucket, slippage)`.
- Pre-warmed token + pool metadata.
- Region-aware routing: mobile edge hits nearest region; swap engine chooses nearest healthy aggregator endpoint.
- Hedged RPC requests for gas/blockhash reads.
- Asynchronous post-trade reconciliation so user gets immediate broadcast acknowledgment.

**Target SLOs**
- P95 quote response < 350 ms (cached) / < 900 ms (fresh).
- P95 submit-to-broadcast < 1.2 s on EVM and Solana (network normal).
- Confirmation notifications within 2 block intervals or 20 sec on Solana.

---

## 9) Suggested Technology Mapping

- **Android**: Kotlin, Jetpack Compose, Coroutines, Ktor client, SQLDelight/Room for local state.
- **Backend**: Node.js 22 + TypeScript, Fastify (or NestJS modules over Fastify adapter).
- **Blockchain SDKs**:
  - EVM: viem/ethers.
  - Solana: @solana/web3.js.
  - BTC: bitcoinjs-lib + PSBT tooling.
- **Infra**: Docker, Kubernetes, Terraform modules per environment.
- **Telemetry**: OTel SDK + Collector, Prometheus scrape, Grafana dashboards + alerts.
