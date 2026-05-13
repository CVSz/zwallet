#!/usr/bin/env bash
set -euo pipefail

cd /opt/zwallet

echo "== Phase 5: Transfer queue + execution pipeline =="

echo "== Create wallet transfer service structure =="
mkdir -p services/wallet-engine/src/services/transfers
mkdir -p services/wallet-engine/src/workers
mkdir -p services/wallet-engine/src/queue

echo "== Add transfer queue service =="

cat > services/wallet-engine/src/services/transfers/transferQueue.ts <<'EOF'
import { randomUUID } from "node:crypto";
import type { WalletTransferRecord } from "../../walletEngine.js";

export type TransferExecutionStatus =
  | "previewed"
  | "queued"
  | "executing"
  | "confirmed"
  | "failed"
  | "cancelled";

export interface TransferQueueEvent {
  id: string;
  transferId: string;
  status: TransferExecutionStatus;
  message: string;
  occurredAt: string;
}

const queueEvents = new Map<string, TransferQueueEvent[]>();

export function appendTransferQueueEvent(
  transferId: string,
  status: TransferExecutionStatus,
  message: string
): TransferQueueEvent {
  const event: TransferQueueEvent = {
    id: randomUUID(),
    transferId,
    status,
    message,
    occurredAt: new Date().toISOString(),
  };

  const events = queueEvents.get(transferId) ?? [];
  events.unshift(event);
  queueEvents.set(transferId, events);

  return event;
}

export function listTransferQueueEvents(transferId: string): TransferQueueEvent[] {
  return queueEvents.get(transferId) ?? [];
}

export function markTransferQueued<T extends WalletTransferRecord>(transfer: T): T {
  appendTransferQueueEvent(transfer.id, "queued", "Transfer queued for execution");
  return {
    ...transfer,
    status: "queued",
    updatedAt: new Date().toISOString(),
  };
}

export function markTransferExecuting<T extends WalletTransferRecord>(transfer: T): T {
  appendTransferQueueEvent(transfer.id, "executing", "Transfer execution started");
  return {
    ...transfer,
    status: "executing",
    updatedAt: new Date().toISOString(),
  };
}

export function markTransferConfirmed<T extends WalletTransferRecord>(
  transfer: T,
  txHash = `simulated-${transfer.id}`
): T & { txHash: string } {
  appendTransferQueueEvent(transfer.id, "confirmed", `Transfer confirmed: ${txHash}`);
  return {
    ...transfer,
    status: "confirmed",
    txHash,
    updatedAt: new Date().toISOString(),
  };
}

export function markTransferFailed<T extends WalletTransferRecord>(
  transfer: T,
  reason: string
): T & { failureReason: string } {
  appendTransferQueueEvent(transfer.id, "failed", reason);
  return {
    ...transfer,
    status: "failed",
    failureReason: reason,
    updatedAt: new Date().toISOString(),
  };
}
EOF

echo "== Add in-memory queue worker =="

cat > services/wallet-engine/src/workers/transferWorker.ts <<'EOF'
import {
  markTransferConfirmed,
  markTransferExecuting,
  markTransferFailed,
} from "../services/transfers/transferQueue.js";
import type { WalletTransferRecord } from "../walletEngine.js";

export interface TransferWorkerResult {
  transfer: WalletTransferRecord;
  simulated: boolean;
}

export async function executeTransferSimulation(
  transfer: WalletTransferRecord
): Promise<TransferWorkerResult> {
  const executing = markTransferExecuting(transfer);

  await new Promise((resolve) => setTimeout(resolve, 50));

  if (BigInt(executing.amountAtomic) <= 0n) {
    return {
      transfer: markTransferFailed(executing, "amountAtomic must be positive"),
      simulated: true,
    };
  }

  return {
    transfer: markTransferConfirmed(executing),
    simulated: true,
  };
}
EOF

echo "== Export Phase 5 modules =="

cat > services/wallet-engine/src/services/transfers/index.ts <<'EOF'
export * from "./transferQueue.js";
EOF

cat > services/wallet-engine/src/workers/index.ts <<'EOF'
export * from "./transferWorker.js";
EOF

echo "== Patch wallet-engine status model =="

python3 - <<'PY'
from pathlib import Path

p = Path("services/wallet-engine/src/walletEngine.ts")
s = p.read_text()

s = s.replace(
"status: 'previewed' | 'queued' | 'signed' | 'broadcasted' | 'failed';",
"status: 'previewed' | 'queued' | 'executing' | 'confirmed' | 'signed' | 'broadcasted' | 'failed' | 'cancelled';\n  txHash?: string;\n  failureReason?: string;"
)

if "export function updateWalletTransfer" not in s:
    s += '''

export function getWalletTransfer(id: string): WalletTransferRecord | undefined {
  return transfers.get(id);
}

export function updateWalletTransfer(record: WalletTransferRecord): WalletTransferRecord {
  transfers.set(record.id, record);
  return record;
}
'''

p.write_text(s)
PY

echo "== Patch wallet-engine exports =="

python3 - <<'PY'
from pathlib import Path

p = Path("services/wallet-engine/src/index.ts")
s = p.read_text()

for line in [
    "export * from './services/transfers/index.js';",
    "export * from './workers/index.js';"
]:
    if line not in s:
        s += "\\n" + line

p.write_text(s)
PY

echo "== Patch admin-wallet transfer queue endpoint =="

python3 - <<'PY'
from pathlib import Path

p = Path("apps/admin-wallet/src/server.ts")
s = p.read_text()

s = s.replace(
"""  queueWalletTransfer,
  type WalletOverview""",
"""  queueWalletTransfer,
  getWalletTransfer,
  updateWalletTransfer,
  executeTransferSimulation,
  type WalletOverview"""
)

old = """    const queueMatch = url.pathname.match(/^\\\\/api\\\\/transfers\\\\/([^/]+)\\\\/queue$/);
    if (req.method === "POST" && queueMatch?.[1]) return sendJson(res, 202, { transfer: queueWalletTransfer(queueMatch[1]) });"""

new = """    const queueMatch = url.pathname.match(/^\\\\/api\\\\/transfers\\\\/([^/]+)\\\\/queue$/);
    if (req.method === "POST" && queueMatch?.[1]) {
      const queued = queueWalletTransfer(queueMatch[1]);
      const result = await executeTransferSimulation(queued);
      const transfer = updateWalletTransfer(result.transfer);
      return sendJson(res, 202, { transfer, simulated: result.simulated });
    }"""

if old in s:
    s = s.replace(old, new)

p.write_text(s)
PY

echo "== Build all =="

find . -name 'tsconfig.tsbuildinfo' -delete

pnpm install --frozen-lockfile=false

pnpm --filter @zwallet/rpc build
pnpm --filter @zwallet/shared-types build
pnpm --filter @zwallet/wallet-engine build
pnpm --filter @zwallet/admin-wallet build

echo "== Restart zwallet =="

sudo systemctl restart zwallet
sleep 3
sudo systemctl status zwallet --no-pager

echo "== Validate health =="

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

curl -s -X POST "https://admin-wallet.zeaz.dev/api/transfers/$TRANSFER_ID/queue" | jq

echo "== Overview =="

curl -s https://admin-wallet.zeaz.dev/api/overview | jq '.transfers[0]'

echo
echo "== PHASE 5 COMPLETE =="
