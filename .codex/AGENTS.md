# 🧠 zWallet Agent Contract

## ABSOLUTE RULES (NON-NEGOTIABLE)

1. NEVER violate ledger invariants
2. NEVER introduce non-idempotent logic
3. NEVER trust request headers
4. NEVER use environment secrets in production
5. ALWAYS follow docs/MASTER_SSOT.md

---

## EXECUTION PROTOCOL

### PLAN FIRST
- Non-trivial tasks MUST be planned

### VERIFY BEFORE RETURN
- ledger balance
- idempotency
- security pipeline integrity

### MINIMAL BLAST RADIUS
- Only change necessary scope

---

## SYSTEM TRUTH

- Ledger = source of truth
- Events = only side effects
- Security = unified pipeline

---

## FORBIDDEN ACTIONS

- Duplicate business logic across stacks
- Bypass Vault
- Direct DB mutation outside ledger
