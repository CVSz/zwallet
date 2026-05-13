#!/usr/bin/env bash
set -euo pipefail

cd /opt/zwallet

echo "== Phase 6: Redis-backed async execution pipeline =="

echo "== Install BullMQ + ioredis =="

pnpm add -w bullmq ioredis

echo "== Create queue directories =="

mkdir -p services/wallet-engine/src/queue
mkdir -p services/wallet-engine/src/jobs
mkdir -p services/wallet-engine/src/workers

echo "== Create Redis connection =="

cat > services/wallet-engine/src/queue/redis.ts <<'EOF'
import IORedis from "ioredis";

export const redisConnection = new IORedis(
  process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  }
);

redisConnection.on("connect", () => {
  console.log("[wallet-engine] redis connected");
});

redisConnection.on("error", (err) => {
  console.error("[wallet-engine] redis error", err);
});
EOF

echo "== Create queue definitions =="

cat > services/wallet-engine/src/queue/queues.ts <<'EOF'
import { Queue } from "bullmq";
import { redisConnection } from "./redis.js";

export const transferExecutionQueue = new Queue(
  "transfer-execution",
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  }
);
EOF

echo "== Create transfer queue job =="

cat > services/wallet-engine/src/jobs/transferExecution.ts <<'EOF'
import { transferExecutionQueue } from "../queue/queues.js";

export interface TransferExecutionJobPayload {
  transferId: string;
}

export async function enqueueTransferExecution(
  payload: TransferExecutionJobPayload
) {
  return transferExecutionQueue.add(
    "execute-transfer",
    payload
  );
}
EOF

echo "== Create transfer worker =="

cat > services/wallet-engine/src/workers/transferWorker.ts <<'EOF'
import { Worker } from "bullmq";

import { redisConnection } from "../queue/redis.js";

import {
  getWalletTransfer,
  updateWalletTransfer,
} from "../walletEngine.js";

import {
  markTransferExecuting,
  markTransferConfirmed,
  markTransferFailed,
} from "../services/transfers/index.js";

const worker = new Worker(
  "transfer-execution",
  async (job) => {
    const transferId = String(job.data.transferId);

    const transfer = getWalletTransfer(transferId);

    if (!transfer) {
      throw new Error(`Transfer not found: ${transferId}`);
    }

    const executing = markTransferExecuting(transfer);

    updateWalletTransfer(executing);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (BigInt(executing.amountAtomic) <= 0n) {
      const failed = markTransferFailed(
        executing,
        "amountAtomic must be positive"
      );

      updateWalletTransfer(failed);

      return failed;
    }

    const confirmed = markTransferConfirmed(
      executing,
      `simulated-${transferId}`
    );

    updateWalletTransfer(confirmed);

    return confirmed;
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  console.log(
    `[transfer-worker] completed ${job.id}`
  );
});

worker.on("failed", (job, err) => {
  console.error(
    `[transfer-worker] failed ${job?.id}`,
    err
  );
});

console.log("[transfer-worker] started");
EOF

echo "== Export queue modules =="

cat > services/wallet-engine/src/queue/index.ts <<'EOF'
export * from "./redis.js";
export * from "./queues.js";
EOF

cat > services/wallet-engine/src/jobs/index.ts <<'EOF'
export * from "./transferExecution.js";
EOF

echo "== Patch wallet-engine exports =="

python3 - <<'PY'
from pathlib import Path

p = Path("services/wallet-engine/src/index.ts")

s = p.read_text()

exports = [
    "export * from './queue/index.js';",
    "export * from './jobs/index.js';"
]

for e in exports:
    if e not in s:
        s += "\n" + e

p.write_text(s.rstrip() + "\n")
PY

echo "== Patch admin-wallet async queue endpoint =="

python3 - <<'PY'
from pathlib import Path

p = Path("apps/admin-wallet/src/server.ts")

s = p.read_text()

s = s.replace(
"""  executeTransferSimulation,""",
"""  enqueueTransferExecution,"""
)

old = """      const queued = queueWalletTransfer(queueMatch[1]);
      const result = await executeTransferSimulation(queued);
      const transfer = updateWalletTransfer(result.transfer);
      return sendJson(res, 202, { transfer, simulated: result.simulated });"""

new = """      const queued = queueWalletTransfer(queueMatch[1]);

      updateWalletTransfer(queued);

      const job = await enqueueTransferExecution({
        transferId: queued.id,
      });

      return sendJson(res, 202, {
        transfer: queued,
        jobId: job.id,
        queued: true,
      });"""

s = s.replace(old, new)

p.write_text(s)
PY

echo "== Create standalone worker launcher =="

cat > services/wallet-engine/src/runTransferWorker.ts <<'EOF'
import "./workers/transferWorker.js";

console.log("[wallet-engine] transfer worker online");

setInterval(() => {}, 1 << 30);
EOF

echo "== Build all =="

find . -name 'tsconfig.tsbuildinfo' -delete

pnpm install --frozen-lockfile=false

pnpm --filter @zwallet/rpc build
pnpm --filter @zwallet/shared-types build
pnpm --filter @zwallet/wallet-engine build
pnpm --filter @zwallet/admin-wallet build

echo "== Create worker systemd service =="

sudo tee /etc/systemd/system/zwallet-transfer-worker.service >/dev/null <<'EOF'
[Unit]
Description=zWallet transfer worker
After=network.target redis.service

[Service]
Type=simple
User=zeazdev
WorkingDirectory=/opt/zwallet
Environment=NODE_ENV=production
Environment=REDIS_URL=redis://127.0.0.1:6379
ExecStart=/usr/bin/node /opt/zwallet/services/wallet-engine/dist/runTransferWorker.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "== Reload systemd =="

sudo systemctl daemon-reload

echo "== Start transfer worker =="

sudo systemctl enable zwallet-transfer-worker
sudo systemctl restart zwallet-transfer-worker
sudo systemctl restart zwallet

sleep 5

echo "== Worker status =="

sudo systemctl status zwallet-transfer-worker --no-pager

echo "== Runtime status =="

sudo systemctl status zwallet --no-pager

echo "== Health =="

curl -s https://admin-wallet.zeaz.dev/healthz
echo

echo "== Create transfer preview =="

TRANSFER_ID="$(
curl -s -X POST https://admin-wallet.zeaz.dev/api/transfers/preview \
  -H 'content-type: application/json' \
  -d '{"chain":"evm","from":"0x1111111111111111111111111111111111111111","to":"0x2222222222222222222222222222222222222222","amountAtomic":"1000000000000000000"}' \
  | jq -r '.transfer.id'
)"

echo "Transfer ID: $TRANSFER_ID"

echo "== Queue transfer =="

curl -s -X POST \
  "https://admin-wallet.zeaz.dev/api/transfers/$TRANSFER_ID/queue" \
  | jq

echo "== Wait for worker =="

sleep 4

echo "== Verify transfer execution =="

curl -s https://admin-wallet.zeaz.dev/api/overview \
  | jq '.transfers[0]'

echo
echo "== PHASE 6 COMPLETE =="
