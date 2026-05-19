# zWallet Repo Upgrade Checklist

_Last updated: 2026-05-04_

## 1) Crypto Engine — **67% (2/3)**
- [x] HD wallet implemented
- [x] secure signing
- [ ] key encryption

## 2) Event System — **100% (3/3)**
- [x] Kafka/NATS integrated
- [x] idempotent jobs
- [x] retry logic

## 3) Swap Engine — **100% (3/3)**
- [x] route aggregation
- [x] slippage protection
- [x] MEV mitigation

## 4) Payments — **100% (3/3)**
- [x] KYC integration
- [x] card issuance
- [x] liquidity bridge

## 5) Infra — **100% (3/3)**
- [x] Dockerized
- [x] K8s ready
- [x] monitoring

## 6) Security — **100% (3/3)**
- [x] no key leakage
- [x] input validation
- [x] rate limiting

---

## Overall Completion — **94% (17/18)**

### Scoring Method
- Each checklist item = 1 point.
- Category % = `(checked items / total items) * 100`.
- Overall % = `(all checked items / 18) * 100`.

### Notes
- `key encryption` is left unchecked pending explicit backend/client-at-rest encryption verification for wallet key material across all runtime paths.
