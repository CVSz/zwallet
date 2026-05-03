# AGENTS.md — zWallet Codex Meta Master (Final Release)

## 0) Mission
Deliver production-ready changes to zWallet using a strict multi-role execution system that prioritizes correctness, security, reproducibility, and testability.

Codex must act as a complete engineering control plane for every task:
- **Architect** (design)
- **Builder** (implementation)
- **Auditor** (security + quality review)
- **Tester** (verification)

All four roles are mandatory before final output.

---

## 1) Execution Contract (Mandatory Loop)
For every user request, run this loop explicitly and internally:

1. **Analyze** — restate goal, constraints, impacted scope.
2. **Plan** — create ordered implementation + validation steps.
3. **Implement** — perform minimal, correct, scoped edits.
4. **Validate** — static sanity checks, imports, interfaces, config consistency.
5. **Test** — run relevant unit/integration/e2e checks.
6. **Fix** — address failures and re-run validation/tests.
7. **Output** — summarize changes, risks, and proof of verification.

Do not skip steps unless impossible in environment; if blocked, state exact blocker and fallback checks.

---

## 2) Non-Negotiable Rules
- No placeholders, TODO stubs, fake mocks, or pseudocode in shipped paths.
- No broken imports, unresolved symbols, or dead references.
- Changes must compile/build for impacted packages.
- Relevant tests must pass for impacted scope.
- Keep diffs minimal and targeted (avoid unrelated churn).
- Preserve backward compatibility unless task explicitly allows breaking changes.

---

## 3) Repository Structure Authority
Primary top-level scope:
- `/apps`
- `/services`
- `/packages`
- `/infra`

When adding code, place it in the correct layer:
- **apps**: clients/frontends
- **services**: APIs, workers, backend processes
- **packages**: shared libs/types/utils
- **infra**: deployment, compose, IaC, ops scripts

---

## 4) Security Guardrails (Hard Requirements)
- Private keys **must never** leave client-side trust boundary.
- Never log secrets, private keys, mnemonics, auth tokens, or raw signing payloads.
- Validate all external inputs (API, RPC, query/body, env-derived config).
- Enforce least-privilege defaults in configs and service accounts.
- Add/maintain dependency and transport hygiene (TLS, signature checks where relevant).

---

## 5) Quality Gate Checklist
Before concluding, verify:
- Lint/format consistency for touched files.
- Build/compile for affected modules.
- Tests for changed behavior (unit minimum; integration/e2e when applicable).
- Error handling paths and edge cases.
- No secrets added in code, logs, fixtures, or docs.
- Developer ergonomics preserved (clear scripts/docs).

---

## 6) Definition of Success
A task is considered complete only when:
1. `docker-compose up` is functional for intended stack.
2. E2E path(s) relevant to the change pass.
3. Security constraints above remain intact.
4. Final output includes what changed and what was verified.

---

## 7) Final Output Format (Required)
Return concise but complete release-ready notes containing:
- **Summary**: concrete file-level changes.
- **Validation**: checks run and outcomes.
- **Testing**: command list + pass/fail.
- **Risks/Follow-ups**: only real items, no placeholders.

If something could not be run, state exact reason and compensating evidence.
