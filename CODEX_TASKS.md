# CODEX_TASKS.md — zWallet Meta Master Task Matrix (Final Release)

This document is the execution playbook for end-to-end zWallet delivery.

## A) Global Delivery Objective
Ship secure, test-validated wallet + swap platform features across apps/services/packages/infra with production-grade quality gates.

---

## B) Role Matrix (Must Run in Order)

### 1) ARCHITECT
**Objective:** produce a coherent, low-risk implementation blueprint.

**Required outputs:**
- Impacted module map (`/apps`, `/services`, `/packages`, `/infra`).
- API and type contract deltas.
- Data-flow + trust-boundary notes (especially key management).
- Risk register: security, migration, performance, compatibility.
- Test strategy mapped to each changed behavior.

**Exit criteria:**
- Plan is actionable and dependency order is clear.

---

### 2) BUILDER
**Objective:** implement the smallest correct diff that satisfies requirements.

**Required outputs:**
- Production-ready code (no placeholders).
- Updated contracts/types and callsites.
- Config/script/docs updates required to run changes.
- Backward-compatible behavior unless explicitly broken by task.

**Exit criteria:**
- Code compiles for affected modules and static checks are clean.

---

### 3) AUDITOR
**Objective:** verify security and correctness before test signoff.

**Required checks:**
- Input validation on all external boundaries.
- No secret leakage in logs/errors.
- Key custody preserved (no private key exfiltration).
- AuthN/AuthZ assumptions verified.
- Dependency/config review for unsafe defaults.

**Exit criteria:**
- No critical/high unresolved findings.

---

### 4) TESTER
**Objective:** prove behavior with repeatable evidence.

**Required test layers (as applicable):**
- Unit tests for core logic.
- Integration tests for API/service boundaries.
- E2E for user-critical flows (wallet lifecycle, swap flow).
- Regression checks for touched bug paths.

**Exit criteria:**
- Relevant tests pass consistently; failures fixed and re-tested.

---

## C) Canonical Execution Pipeline
1. Scope task + constraints.
2. Produce implementation plan.
3. Apply code changes.
4. Run lint/static validation.
5. Run build/compile.
6. Run unit/integration/e2e tests.
7. Fix defects and re-run affected checks.
8. Prepare release summary with proof.

---

## D) Task Backlog Template (Use Per Feature/Fix)
For each task, track:
- **ID/Name**
- **Owner Role State**: Architect → Builder → Auditor → Tester
- **Scope Paths**
- **Contracts Changed**
- **Security Notes**
- **Checks Run (commands + status)**
- **Artifacts** (PR, logs, screenshots if UI changed)
- **Final Status**: Done / Blocked (with exact blocker)

---

## E) Release Readiness Gates
Release can proceed only if all are true:
- `docker-compose up` succeeds for the intended environment.
- Critical E2E flows pass.
- No unresolved critical/high security issues.
- No broken build artifacts in impacted modules.
- Change log / summary is complete and reproducible.

---

## F) Definition of Done (DoD)
A task is done when:
- Functional requirements are met.
- Security constraints are preserved.
- Tests are passing for impacted scope.
- Operational run path remains healthy.
- Evidence is documented in final output.
