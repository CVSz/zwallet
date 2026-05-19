# 🚀 MVP Launch Plan (FinTech - Thailand / PromptPay)

## 🎯 Objective
Launch a **real usable MVP** in 4–6 weeks:
- Wallet
- Deposit (PromptPay)
- Transfer (internal)
- Withdraw (PromptPay)

---

## 🧱 1. Product Scope (STRICT)

### Core Features ONLY
- User registration + KYC (basic)
- Wallet balance (ledger-backed)
- Internal transfer (user → user)
- PromptPay deposit
- PromptPay withdrawal

❌ NOT INCLUDED (for MVP):
- FX
- Cross-border
- Advanced analytics

---

## 🏗 2. Required APIs

### Auth
```
POST /auth/register
POST /auth/login
```

### Wallet
```
GET /wallet/balance
POST /wallet/transfer
```

### Payment
```
POST /deposit/promptpay
POST /withdraw/promptpay
GET /payment/status/:id
```

---

## 🔗 3. External Integration

### PromptPay
- QR generation API
- webhook for payment confirmation

### KYC
- Sumsub / manual fallback

---

## 🖥 4. Frontend (Minimal)

### Screens
- Login / Register
- Dashboard (balance)
- Send money
- Deposit QR
- Withdraw form

---

## ⚙️ 5. Infrastructure (Lean)

- 1 region (APAC)
- 1 K8s cluster
- Postgres HA (can start single-node)
- Redis (idempotency + locks)

---

## 📅 6. Timeline (Aggressive)

### Week 1
- Auth + wallet
- Ledger integration

### Week 2
- Transfer API
- Idempotency + locking

### Week 3
- PromptPay integration
- Webhook handling

### Week 4
- Frontend basic UI
- QA + bug fixes

### Week 5–6
- Load test
- Security review
- Soft launch

---

## 📊 7. Launch Metrics

- 100–1,000 users
- <1% failed tx
- 0 double-spend

---

## 🛑 8. Hard Rules

- Ledger ALWAYS source of truth
- All transfers idempotent
- No manual DB edits

---

## 🔥 MVP Definition DONE

System can:
- accept real deposits
- move money between users
- withdraw to bank

---

## 🚀 AFTER MVP

- Add fees
- Add FX
- Scale infra

---

## ❗ NOTE

Move FAST but:
- do NOT break ledger integrity
- do NOT skip reconciliation
