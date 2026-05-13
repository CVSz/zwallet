#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

REPO="${REPO:-cvsz/zwallet}"
BASE_BRANCH="${BASE_BRANCH:-main}"
LABELS="${LABELS:-codex,production,wallet-engine,admin-wallet}"
DRY_RUN="${DRY_RUN:-false}"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

create_issue() {
  local title="$1"
  local body="$2"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "---"
    echo "TITLE: $title"
    echo "$body"
    return 0
  fi
  gh issue create --repo "$REPO" --title "$title" --label "$LABELS" --body "$body"
}

need gh

COMMON_RULES='Repository: cvsz/zwallet
Base branch: main
Create one PR for this prompt only.
Do not include generated files such as tsconfig.tsbuildinfo.
Do not commit secrets, private keys, wallet seed phrases, tokens, or Cloudflare credentials.
All sensitive wallet operations must be designed so private keys are never returned by any API.
Preserve existing live endpoints unless this prompt explicitly changes them.
Keep admin-wallet.zeaz.dev compatible with Cloudflare Tunnel origin localhost:8081.

Required checks:
```bash
pnpm install --frozen-lockfile=false
pnpm -r --if-present run typecheck
pnpm -r --if-present run lint
pnpm --filter @zwallet/admin-wallet build
```
'

create_issue "Codex 01: stabilize package build outputs and runtime exports" "${COMMON_RULES}

Implement production-safe build packaging for the workspace packages consumed by @zwallet/admin-wallet.

Context:
- @zwallet/admin-wallet currently imports @zwallet/wallet-engine and @zwallet/shared-types.
- Some package exports point at src/*.ts, which causes runtime problems when running compiled JS.
- The current systemd workaround can run tsx, but production should run node dist/server.js.

Tasks:
1. Add build scripts to @zwallet/shared-types and @zwallet/wallet-engine.
2. Ensure each package emits dist/*.js and dist/*.d.ts.
3. Update package.json exports for these packages to point to dist outputs.
4. Keep typecheck scripts working.
5. Update @zwallet/admin-wallet build so it compiles against built workspace packages.
6. Add or update docs showing the production build order.
7. Do not commit generated tsconfig.tsbuildinfo files.

Acceptance:
- pnpm --filter @zwallet/shared-types build passes.
- pnpm --filter @zwallet/wallet-engine build passes.
- pnpm --filter @zwallet/admin-wallet build passes.
- node apps/admin-wallet/dist/server.js starts locally after package builds.
- No runtime import tries to load services/wallet-engine/src/*.js.
"

create_issue "Codex 02: commit admin-wallet dependency lock stability" "${COMMON_RULES}

Stabilize @zwallet/admin-wallet dependency metadata and lockfile.

Tasks:
1. Ensure apps/admin-wallet/package.json declares all direct imports.
2. Ensure pnpm-lock.yaml is updated and reproducible.
3. Remove unnecessary dev/runtime dependencies if production node dist/server.js no longer needs tsx.
4. Add a short package README or docs section for admin-wallet local build/run.

Acceptance:
- Fresh clone install works with pnpm install --frozen-lockfile.
- pnpm --filter @zwallet/admin-wallet build passes.
- pnpm --filter @zwallet/admin-wallet start starts from dist/server.js.
"

create_issue "Codex 03: PostgreSQL schema and repository layer" "${COMMON_RULES}

Add PostgreSQL persistence for zWallet runtime state.

Current in-memory entities:
- WalletAccount
- WalletBalance
- WalletTransferRecord
- WalletEventRecord

Tasks:
1. Add a database schema/migration for wallet_accounts, wallet_balances, wallet_transfers, wallet_events, wallet_audit_log.
2. Add a persistence repository interface in wallet-engine.
3. Add an in-memory repository implementation preserving current behavior.
4. Add a Postgres repository implementation using pg or the repo-standard DB library.
5. Keep wallet-engine business functions independent from raw SQL.
6. Add environment configuration for DATABASE_URL.

Acceptance:
- migrations are idempotent.
- repository tests cover create/list account, balance list, transfer create/list, event list.
- service can run with in-memory mode when DATABASE_URL is absent.
- service can run with Postgres mode when DATABASE_URL is set.
"

create_issue "Codex 04: repository-backed admin API" "${COMMON_RULES}

Replace admin-wallet direct in-memory usage with repository-backed wallet-engine services.

Tasks:
1. Add a wallet service factory that chooses Postgres repository if DATABASE_URL is set, otherwise in-memory repository.
2. Update GET /api/overview to read from the repository/service.
3. Update POST /api/wallets to persist accounts.
4. Update POST /api/transfers/preview to persist transfer previews and events.
5. Update POST /api/transfers/:id/queue to persist queued state.
6. Keep existing HTML UI behavior unchanged.
7. Add correlation IDs to JSON API responses.

Acceptance:
- accounts survive service restart when DATABASE_URL is configured.
- transfer previews survive service restart when DATABASE_URL is configured.
- HTML UI still renders accounts, balances, transfers, and events.
- GET /healthz remains lightweight.
- GET /readyz validates repository connectivity.
"

create_issue "Codex 05: Redis queue and wallet worker skeleton" "${COMMON_RULES}

Add Redis-backed wallet job queue and worker skeleton.

Tasks:
1. Add a queue package/module for wallet jobs.
2. Define job types: transfer.sign.requested, transfer.broadcast.requested, balance.sync.requested.
3. Implement Redis queue adapter with a memory fallback for development.
4. Add services/wallet-worker package or app.
5. Worker should consume queued transfer jobs and update transfer status from queued to signed-placeholder or failed.
6. Add structured logs for job lifecycle.

Acceptance:
- POST /api/transfers/:id/queue enqueues a job.
- worker consumes the job and updates transfer status.
- failed jobs are visible in logs.
- Redis unavailable should make /readyz degraded when Redis mode is configured.
"

create_issue "Codex 06: RPC integration foundation" "${COMMON_RULES}

Implement chain RPC read operations using the existing rpcPool foundation.

Tasks:
1. Add wallet-engine interfaces for ChainClient.
2. Implement EVM read methods: getBalance, getNonce, estimateFee placeholder, getTransactionStatus placeholder.
3. Implement Solana and Bitcoin placeholder adapters with explicit not_configured behavior if RPC URLs are absent.
4. Add GET /api/accounts/:id/balance/sync.
5. Persist synced balances and emit wallet.balance.synced event.
6. Add safe timeout and retry behavior.

Acceptance:
- configured EVM RPC can sync a balance.
- absent RPC returns clear JSON error, not process crash.
- balance sync emits an audit/event record.
"

create_issue "Codex 07: signing architecture without key exposure" "${COMMON_RULES}

Add transaction signing architecture with no private-key exposure.

Tasks:
1. Define Signer interface.
2. Add DevSigner only for local/testing, disabled by default in production.
3. Add ExternalSigner placeholder adapter for future KMS/HSM/signing service.
4. Add signing request status fields to wallet_transfers.
5. Add POST /api/transfers/:id/sign.
6. Require policy approval before signing.
7. Ensure no API returns private keys, seed phrases, raw secrets, or signer credentials.

Acceptance:
- signing endpoint returns signed-placeholder metadata in dev mode only.
- production mode without signer configured returns 503 signer_not_configured.
- audit event is emitted for every signing attempt.
"

create_issue "Codex 08: policy and compliance gates" "${COMMON_RULES}

Implement wallet policy checks before queue/sign/broadcast.

Tasks:
1. Add policy engine with allowed chains, max amount per transfer, blocked destination addresses, daily transfer count/amount velocity placeholder.
2. Add policy decision records to audit log.
3. Enforce policy in transfer queue/sign/broadcast paths.
4. Add admin API to view active policy.
5. Add tests for allow and deny decisions.

Acceptance:
- denied transfer cannot move to queued.
- policy denial returns structured JSON with reason code.
- audit log records allow/deny decision.
"

create_issue "Codex 09: authentication and Cloudflare Access identity" "${COMMON_RULES}

Add operator authentication and role checks.

Tasks:
1. Parse Cloudflare Access identity headers when present.
2. Add dev shared-secret fallback only when NODE_ENV is not production or explicit ALLOW_DEV_AUTH=true.
3. Define roles: viewer, operator, approver, admin.
4. Protect endpoints: overview viewer+, create wallet operator+, queue transfer operator+, sign/broadcast approver+, policy/settings admin.
5. Add auth context to audit logs.
6. Keep /healthz public.

Acceptance:
- unauthenticated write requests are rejected.
- Cloudflare Access identity is reflected in audit logs.
- dev auth cannot be accidentally active in production without explicit flag.
"

create_issue "Codex 10: production admin UI componentization" "${COMMON_RULES}

Replace single-file server-rendered admin UI with maintainable production UI structure while keeping API compatibility.

Tasks:
1. Create UI source structure under apps/admin-wallet/src/ui or a frontend sub-app.
2. Preserve current routes and API endpoints.
3. Add pages/sections: Overview, Accounts, Balances, Transfers, Events, Policies, Settings.
4. Add client-side fetch for /api/overview.
5. Add forms for create account and transfer preview.
6. Add loading/error states.
7. Keep the app buildable with existing systemd/runtime approach.

Acceptance:
- admin-wallet UI renders same or better functionality than current HTML.
- API contract does not regress.
- build passes.
"

create_issue "Codex 11: observability and operational health" "${COMMON_RULES}

Add production observability to admin-wallet and wallet-engine.

Tasks:
1. Add structured JSON logging.
2. Add correlation IDs to requests/responses.
3. Add /metrics in Prometheus text format.
4. Split /healthz and /readyz clearly: healthz process alive, readyz DB/Redis/config dependencies.
5. Add request duration metrics and wallet operation counters.
6. Add error counters.

Acceptance:
- GET /metrics returns valid Prometheus text.
- readyz returns degraded status when configured dependencies are down.
- every write operation logs correlationId and operator identity when available.
"

create_issue "Codex 12: deploy scripts and systemd production mode" "${COMMON_RULES}

Add deployment automation for /opt/zwallet production runtime.

Tasks:
1. Add scripts/deploy-admin-wallet.sh.
2. Script should git pull, pnpm install --frozen-lockfile, build shared-types, build wallet-engine, build admin-wallet, install/update systemd unit, restart service, validate local and public health.
3. systemd unit should run node dist/server.js, not tsx, once Prompt 01 is complete.
4. Add scripts/repair-admin-wallet.sh for health repair.
5. Add docs for environment variables.

Acceptance:
- one command deploys admin-wallet from clean checkout.
- service survives reboot.
- health validation fails loudly when tunnel/origin is broken.
"

create_issue "Codex 13: CI/CD baseline" "${COMMON_RULES}

Add GitHub Actions CI for zWallet production wallet runtime.

Tasks:
1. Add workflow for pnpm install, lint, typecheck, build.
2. Include shared-types, wallet-engine, admin-wallet, wallet-worker if present.
3. Add smoke test that starts admin-wallet and calls /healthz and /api/overview.
4. Add path filters for workspace changes.
5. Ensure workflow_dispatch is available.

Acceptance:
- CI passes on main.
- workflow can be triggered manually.
- smoke test fails if admin-wallet cannot start.
"

create_issue "Codex 14: release hardening and security review" "${COMMON_RULES}

Perform release hardening for zWallet runtime.

Tasks:
1. Review GitHub Dependabot vulnerabilities and update safe dependencies.
2. Add SECURITY.md wallet-key handling policy.
3. Add production environment checklist.
4. Add backup/restore docs for wallet DB.
5. Add incident rollback docs.
6. Tag release after CI and production validation.

Acceptance:
- dependency vulnerabilities reduced or explicitly documented if blocked.
- SECURITY.md states no key/seed material is stored or returned by admin UI APIs.
- release checklist can be followed by an operator.
"

echo "Codex task issues generated for $REPO"
