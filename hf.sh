cd /opt/zwallet || exit 1

set -e

echo "== Patch queue payload transport =="

cat > services/wallet-engine/src/jobs/transferExecution.ts <<'EOF'
import { transferExecutionQueue } from "../queue/queues.js";
import type { WalletTransferRecord } from "../walletEngine.js";

export interface TransferExecutionJobPayload {
  transfer: WalletTransferRecord;
}

export async function enqueueTransferExecution(
  transfer: WalletTransferRecord
) {
  return transferExecutionQueue.add(
    "execute-transfer",
    {
      transfer,
    }
  );
}
EOF

echo "== Patch worker =="

cat > services/wallet-engine/src/workers/transferWorker.ts <<'EOF'
import { Worker } from "bullmq";

import { redisConnection } from "../queue/redis.js";

import {
  markTransferExecuting,
  markTransferConfirmed,
  markTransferFailed,
} from "../services/transfers/index.js";

const worker = new Worker(
  "transfer-execution",
  async (job) => {
    const transfer = job.data.transfer;

    const executing = markTransferExecuting(transfer);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (BigInt(executing.amountAtomic) <= 0n) {
      return markTransferFailed(
        executing,
        "amountAtomic must be positive"
      );
    }

    return markTransferConfirmed(
      executing,
      `simulated-${executing.id}`
    );
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

worker.on("completed", (job, result) => {
  console.log(
    `[transfer-worker] completed ${job.id}`,
    result?.status
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

echo "== Patch admin-wallet queue handler =="

python3 - <<'PY'
from pathlib import Path

p = Path("apps/admin-wallet/src/server.ts")

s = p.read_text()

s = s.replace(
"""      const job = await enqueueTransferExecution({
        transferId: queued.id,
      });""",
"""      const job = await enqueueTransferExecution(
        queued
      );"""
)

p.write_text(s)
PY

echo "== Rebuild =="

find . -name 'tsconfig.tsbuildinfo' -delete

pnpm --filter @zwallet/wallet-engine build
pnpm --filter @zwallet/admin-wallet build

echo "== Restart =="

sudo systemctl restart zwallet-transfer-worker
sudo systemctl restart zwallet

sleep 5

echo "== Test =="

TRANSFER_ID="$(
curl -s -X POST https://admin-wallet.zeaz.dev/api/transfers/preview \
  -H 'content-type: application/json' \
  -d '{"chain":"evm","from":"0x1111111111111111111111111111111111111111","to":"0x2222222222222222222222222222222222222222","amountAtomic":"1000000000000000000"}' \
  | jq -r '.transfer.id'
)"

curl -s -X POST \
  "https://admin-wallet.zeaz.dev/api/transfers/$TRANSFER_ID/queue" \
  | jq

sleep 5

curl -s https://admin-wallet.zeaz.dev/api/overview \
  | jq '.transfers[0]'

echo
echo "== PHASE 6.1 COMPLETE =="
