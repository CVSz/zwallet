#!/usr/bin/env bash
set -euo pipefail

cd /opt/zwallet

echo "== Restore queue exports =="

mkdir -p services/wallet-engine/src/queue
mkdir -p services/wallet-engine/src/jobs

echo
echo "== Verify queue index =="

cat > services/wallet-engine/src/queue/index.ts <<'EOT'
export * from "./redis.js";
export * from "./queues.js";
EOT

echo
echo "== Verify jobs index =="

cat > services/wallet-engine/src/jobs/index.ts <<'EOT'
export * from "./transferExecution.js";
EOT

echo
echo "== Replace root exports with full export graph =="

cat > services/wallet-engine/src/index.ts <<'EOT'
export * from "./walletEngine.js";

export * from "./services/transfers/index.js";
export * from "./services/overview/index.js";

export * from "./repositories/postgres/transfers.js";
export * from "./repositories/postgres/nonces.js";
export * from "./repositories/postgres/pendingTransactions.js";
export * from "./repositories/postgres/signingKeys.js";
export * from "./repositories/postgres/signingAudit.js";

export * from "./policy/signingPolicy.js";

export * from "./queue/index.js";
export * from "./jobs/index.js";
export * from "./workers/index.js";

export * from "./adapters/index.js";

export * from "./signers/index.js";
EOT

echo
echo "== Clean cache =="

find . -name 'tsconfig.tsbuildinfo' -delete

echo
echo "== Rebuild =="

pnpm --filter @zwallet/wallet-engine build
pnpm --filter @zwallet/admin-wallet build

echo
echo "== Restart services =="

sudo systemctl restart zwallet-transfer-worker
sudo systemctl restart zwallet

sleep 5

echo
echo "== Health =="

curl -s https://admin-wallet.zeaz.dev/healthz
echo

echo
echo "== Phase 12 export repair complete =="
