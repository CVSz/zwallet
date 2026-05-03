# CODEX_TASKS_MASTER_FORM.md — Deep Meta Full Master Implementation Form

This form operationalizes `CODEX_TASKS.md` into a release-control artifact with strict Architect/Builder/Auditor/Tester gates.

## 1) Global Execution Gate (must be completed per work item)
For each work item in `CODEX_TASKS.md`, record evidence for all four roles:

- **Architect**
  - Scope statement recorded.
  - Interfaces/contracts identified.
  - Backward compatibility impact assessed.
- **Builder**
  - Minimal diff applied.
  - No placeholder logic or dead references introduced.
  - Changed modules compile.
- **Auditor**
  - Security guardrails checked (no key leakage, no secret logging, validated boundaries).
  - Dependency/runtime config impact reviewed.
  - Threats/failure modes reviewed.
- **Tester**
  - Relevant tests added/updated.
  - Impacted suites executed.
  - Failing checks fixed and re-run.

A work item is **Done** only if all four role gates are satisfied with command evidence.

## 2) Master Section Execution Matrix
Use this matrix per section (`0` through `11`) in `CODEX_TASKS.md`.

| Section | Objective | Architect Gate | Builder Gate | Auditor Gate | Tester Gate | Evidence Commands | Status |
|---|---|---|---|---|---|---|---|
| 0 Program Rules | Enforce execution contract | Required | Required | Required | Required | Recorded per task | In progress |
| 1 Monorepo Foundation | Layout/tooling/CI foundation | Required | Required | Required | Required | Recorded per task | In progress |
| 2 Contract-First Backbone | OpenAPI/Zod/Prisma/Event alignment | Required | Required | Required | Required | Recorded per task | Not started |
| 3 Wallet Engine | Key derivation/signing/security | Required | Required | Required | Required | Recorded per task | Not started |
| 4 Swap Engine | Routing/execution/fault handling | Required | Required | Required | Required | Recorded per task | Not started |
| 5 Android App | Kotlin/Compose secure UX | Required | Required | Required | Required | Recorded per task | Not started |
| 6 Backend API | Auth/orchestration/relay | Required | Required | Required | Required | Recorded per task | Not started |
| 7 Indexer Service | Multi-chain ingestion reliability | Required | Required | Required | Required | Recorded per task | Not started |
| 8 Security Hardening | Defense-in-depth controls | Required | Required | Required | Required | Recorded per task | Not started |
| 9 DevOps/Runtime | Docker/K8s/Terraform/CI | Required | Required | Required | Required | Recorded per task | In progress |
| 10 Test Program | Unit/integration/e2e gates | Required | Required | Required | Required | Recorded per task | In progress |
| 11 Final Execution | Runtime signoff/release evidence | Required | Required | Required | Required | Recorded per task | In progress |

## 3) Work-Item Completion Record (copy this block per completed item)

### Work Item ID
`<section.subsection.item>`

### Requirement
State the exact checklist requirement from `CODEX_TASKS.md`.

### Implementation Outcome
Describe concrete file-level changes and resulting behavior.

### Four-Role Gate Evidence
- Architect: design note and compatibility rationale.
- Builder: implementation diff summary.
- Auditor: security/quality review summary.
- Tester: executed tests and outcomes.

### Command Evidence
List exact commands and outcomes used to validate this item.

### Risks / Follow-ups
Only real residual risks with mitigation path.

## 4) Mandatory Validation Stack (per changed scope)
- Lint/format checks for touched modules.
- Build/compile checks for impacted packages/services/apps.
- Unit tests for changed behavior.
- Integration/E2E checks when behavior crosses service boundaries.
- Security sanity pass (secret handling, boundary validation, auth/replay/signature constraints).

## 5) Release-Complete Conditions
A release can be declared complete only when:
1. Every remaining unchecked task in `CODEX_TASKS.md` is either completed with evidence or explicitly waived with rationale.
2. No unresolved critical/high security findings remain.
3. `docker-compose` intended stack can be brought up and critical services are healthy.
4. Full verification (lint/test/build) is green for impacted scopes.
5. Final signoff includes summary, validation, testing, and residual risk disclosure.

## 6) Current Baseline Snapshot (from `CODEX_TASKS.md`)
- Sections with partial progress: `0`, `1`, `9`, `10`, `11`.
- Sections mostly not started: `2`, `3`, `4`, `5`, `6`, `7`, `8`.
- Environment blocker already recorded: `docker-compose` unavailable in current container, preventing local stack runtime verification.

This file is the execution form; `CODEX_TASKS.md` remains the source checklist.
