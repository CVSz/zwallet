# 🏦 Real Banking Rails Integration (Execution Plan)

## 1. Payment Rails Mapping

### 🇹🇭 Thailand
- PromptPay (Bank APIs / ITMX)
- QR Payment (EMVCo)

### 🇺🇸 USA
- ACH (NACHA)
- Wire (Fedwire)

### 🇪🇺 Europe
- SEPA Credit Transfer (SCT)
- SEPA Instant (SCT Inst)

### 🌍 Global
- SWIFT (MT / ISO20022)

---

## 2. Integration Architecture

### Adapter Pattern
Each rail uses isolated adapter:

```
interface PaymentRailAdapter {
  send(payment): Promise<Result>
  status(id): Promise<Status>
  reconcile(): Promise<void>
}
```

---

## 3. Settlement Flow

1. User initiates transfer
2. Internal ledger lock (atomic)
3. Route → rail adapter
4. External settlement
5. Callback/webhook
6. Reconcile + finalize ledger

---

## 4. Compliance Pipeline

- KYC verification (external provider)
- AML screening (pre + post transaction)
- Sanctions list check

---

## 5. Liquidity Handling

- Prefunded accounts per rail
- Balance tracking
- Auto top-up triggers

---

## 6. Failure Handling

- Retry (idempotent)
- Dead-letter queue (Kafka)
- Manual review queue

---

## 7. Security Requirements

- Signed requests (HMAC)
- mTLS with banking partners
- IP allowlist

---

## 8. Observability

- Track per rail:
  - success rate
  - latency
  - settlement delay

---

## 9. Deployment Strategy

- Start with 1 rail (PromptPay or SEPA)
- Validate flows
- Expand region-by-region

---

## 🔥 IMPORTANT

This layer requires:
- bank partnership
- API credentials
- regulatory approval

Without these → system cannot move real money
