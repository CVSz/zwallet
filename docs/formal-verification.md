# 🧠 FORMAL VERIFICATION LAYER (FINANCIAL CORRECTNESS)

## 🎯 Goal
Provide a **state-machine level proof** that the system preserves money under all allowed transitions.

---

# 1. SYSTEM MODEL

Define system state:

```
State S = (L, B, O)

L = ledger_entries (append-only)
B = account_balance (projection)
O = outbox (event log)
```

---

# 2. INVARIANTS

## I1 — Double Entry
For any transaction t:

```
Σ debit(t) - Σ credit(t) = 0
```

## I2 — Global Conservation

```
Σ all ledger_entries = 0
```

## I3 — Balance Projection

```
∀ account a:
B[a] = Σ(L where account_id = a)
```

## I4 — Non-negative Constraint

```
∀ a: B[a] ≥ 0
```

## I5 — Immutability

```
L is append-only
```

---

# 3. TRANSITIONS

## T1 — postTransaction

Preconditions:
- B[debit] ≥ amount

Transition:

```
L' = L ∪ {
  (tx, debit, amount, debit),
  (tx, credit, amount, credit)
}

B'[debit] = B[debit] - amount
B'[credit] = B[credit] + amount

O' = O ∪ event(tx)
```

---

# 4. PROOF SKETCH

## I1 preserved:

By construction: inserted entries cancel each other.

## I2 preserved:

Sum of all ledger entries remains unchanged (0 delta).

## I3 preserved:

Balance updated in same atomic transaction as ledger insert.

## I4 preserved:

Precondition ensures no negative balance.

## I5 preserved:

No DELETE/UPDATE permissions.

---

# 5. FAILURE MODEL

Assume failures:

- crash before commit
- crash after commit
- retry
- concurrent execution

## Case A: crash before commit
→ no state change

## Case B: crash after commit
→ L and B consistent (same tx)
→ O pending → eventually delivered

## Case C: retry
→ idempotency prevents duplicate transitions

## Case D: concurrency
→ SERIALIZABLE ensures equivalent serial execution

---

# 6. PROOF OBLIGATION

We must show:

```
∀ transition T:
if I(S) holds before
then I(S') holds after
```

Since:
- all transitions enforce preconditions
- DB ensures atomicity
- constraints prevent invalid states

⇒ invariants preserved

---

# 7. LIMITS OF PROOF

Proof assumes:

- DB correctness (PostgreSQL guarantees)
- no superuser bypass
- correct deployment of constraints

---

# 🔥 FINAL RESULT

Under defined model:

```
Money cannot be created or destroyed
```

---

# 🏦 CLASSIFICATION

> Formally Verified Ledger Core (Practical Model)

---

# ⚠️ NOTE

This is a **model-level proof**, not machine-checked (e.g., TLA+, Coq).

Further strengthening:
- TLA+ spec
- model checking
- property-based testing
