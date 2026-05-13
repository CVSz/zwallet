#!/usr/bin/env bash
set -euo pipefail

cd /opt/zwallet

echo "== Phase 8: Blockchain adapter layer =="

mkdir -p services/wallet-engine/src/chains
mkdir -p services/wallet-engine/src/chains/evm
mkdir -p services/wallet-engine/src/chains/solana
mkdir -p services/wallet-engine/src/chains/bitcoin
mkdir -p services/wallet-engine/src/signing

cat > services/wallet-engine/src/chains/types.ts <<'EOF'
import type { WalletTransferRecord } from "../walletEngine.js";

export interface ChainBalance {
  chain: WalletTransferRecord["chain"];
  address: string;
  asset: string;
  amountAtomic: string;
  decimals: number;
}

export interface ChainFeeEstimate {
  chain: WalletTransferRecord["chain"];
  feeAtomic: string;
  gasLimit?: string;
  gasPrice?: string;
}

export interface ChainBroadcastResult {
  txHash: string;
  simulated: boolean;
}

export interface ChainAdapter {
  chain: WalletTransferRecord["chain"];
  getBalance(address: string): Promise<ChainBalance>;
  estimateFee(transfer: WalletTransferRecord): Promise<ChainFeeEstimate>;
  broadcastTransfer(transfer: WalletTransferRecord): Promise<ChainBroadcastResult>;
}
EOF

cat > services/wallet-engine/src/chains/evm/index.ts <<'EOF'
import { createHash } from "node:crypto";
import type { ChainAdapter, ChainBalance, ChainBroadcastResult, ChainFeeEstimate } from "../types.js";
import type { WalletTransferRecord } from "../../walletEngine.js";

export class EvmChainAdapter implements ChainAdapter {
  readonly chain = "evm" as const;

  async getBalance(address: string): Promise<ChainBalance> {
    return {
      chain: this.chain,
      address,
      asset: "ETH",
      amountAtomic: "0",
      decimals: 18
    };
  }

  async estimateFee(_transfer: WalletTransferRecord): Promise<ChainFeeEstimate> {
    return {
      chain: this.chain,
      feeAtomic: "21000000000000",
      gasLimit: "21000",
      gasPrice: "1000000000"
    };
  }

  async broadcastTransfer(transfer: WalletTransferRecord): Promise<ChainBroadcastResult> {
    const txHash = "0x" + createHash("sha256")
      .update(`${transfer.id}:${transfer.digest}:${transfer.amountAtomic}`)
      .digest("hex");

    return {
      txHash,
      simulated: true
    };
  }
}
EOF

cat > services/wallet-engine/src/chains/solana/index.ts <<'EOF'
import { createHash } from "node:crypto";
import type { ChainAdapter, ChainBalance, ChainBroadcastResult, ChainFeeEstimate } from "../types.js";
import type { WalletTransferRecord } from "../../walletEngine.js";

export class SolanaChainAdapter implements ChainAdapter {
  readonly chain = "solana" as const;

  async getBalance(address: string): Promise<ChainBalance> {
    return {
      chain: this.chain,
      address,
      asset: "SOL",
      amountAtomic: "0",
      decimals: 9
    };
  }

  async estimateFee(_transfer: WalletTransferRecord): Promise<ChainFeeEstimate> {
    return {
      chain: this.chain,
      feeAtomic: "5000"
    };
  }

  async broadcastTransfer(transfer: WalletTransferRecord): Promise<ChainBroadcastResult> {
    const txHash = createHash("sha256")
      .update(`solana:${transfer.id}:${transfer.digest}`)
      .digest("hex");

    return {
      txHash,
      simulated: true
    };
  }
}
EOF

cat > services/wallet-engine/src/chains/bitcoin/index.ts <<'EOF'
import { createHash } from "node:crypto";
import type { ChainAdapter, ChainBalance, ChainBroadcastResult, ChainFeeEstimate } from "../types.js";
import type { WalletTransferRecord } from "../../walletEngine.js";

export class BitcoinChainAdapter implements ChainAdapter {
  readonly chain = "bitcoin" as const;

  async getBalance(address: string): Promise<ChainBalance> {
    return {
      chain: this.chain,
      address,
      asset: "BTC",
      amountAtomic: "0",
      decimals: 8
    };
  }

  async estimateFee(_transfer: WalletTransferRecord): Promise<ChainFeeEstimate> {
    return {
      chain: this.chain,
      feeAtomic: "1000"
    };
  }

  async broadcastTransfer(transfer: WalletTransferRecord): Promise<ChainBroadcastResult> {
    const txHash = createHash("sha256")
      .update(`bitcoin:${transfer.id}:${transfer.digest}`)
      .digest("hex");

    return {
      txHash,
      simulated: true
    };
  }
}
EOF

cat > services/wallet-engine/src/chains/index.ts <<'EOF'
import type { WalletTransferRecord } from "../walletEngine.js";
import type { ChainAdapter } from "./types.js";
import { EvmChainAdapter } from "./evm/index.js";
import { SolanaChainAdapter } from "./solana/index.js";
import { BitcoinChainAdapter } from "./bitcoin/index.js";

const adapters: Record<WalletTransferRecord["chain"], ChainAdapter> = {
  evm: new EvmChainAdapter(),
  solana: new SolanaChainAdapter(),
  bitcoin: new BitcoinChainAdapter()
};

export function getChainAdapter(chain: WalletTransferRecord["chain"]): ChainAdapter {
  return adapters[chain];
}

export * from "./types.js";
export * from "./evm/index.js";
export * from "./solana/index.js";
export * from "./bitcoin/index.js";
EOF

cat > services/wallet-engine/src/signing/index.ts <<'EOF'
import { createHash } from "node:crypto";
import type { WalletTransferRecord } from "../walletEngine.js";

export interface SigningResult {
  signature: string;
  signerMode: "simulated";
}

export async function signTransferSimulation(
  transfer: WalletTransferRecord
): Promise<SigningResult> {
  return {
    signature: createHash("sha256")
      .update(`signature:${transfer.id}:${transfer.digest}`)
      .digest("hex"),
    signerMode: "simulated"
  };
}
EOF

echo "== Patch worker to use chain adapters =="

cat > services/wallet-engine/src/workers/transferWorker.ts <<'EOF'
import { Worker } from "bullmq";

import { redisConnection } from "../queue/redis.js";
import { PostgresTransferRepository } from "../repositories/postgres/transfers.js";
import { getChainAdapter } from "../chains/index.js";
import { signTransferSimulation } from "../signing/index.js";

const repo = process.env.DATABASE_URL
  ? new PostgresTransferRepository()
  : undefined;

const worker = new Worker(
  "transfer-execution",
  async (job) => {
    const transferId = String(job.data.transferId);

    if (!repo) {
      throw new Error("DATABASE_URL is required for distributed transfer worker");
    }

    const transfer = await repo.getById(transferId);

    if (!transfer) {
      throw new Error(`Transfer not found: ${transferId}`);
    }

    await repo.updateStatus(transfer.id, "executing");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (BigInt(transfer.amountAtomic) <= 0n) {
      return repo.updateStatus(transfer.id, "failed", {
        failureReason: "amountAtomic must be positive"
      });
    }

    const adapter = getChainAdapter(transfer.chain);
    await adapter.estimateFee(transfer);
    await signTransferSimulation(transfer);
    const broadcast = await adapter.broadcastTransfer(transfer);

    return repo.updateStatus(transfer.id, "confirmed", {
      txHash: broadcast.txHash
    });
  },
  {
    connection: redisConnection,
    concurrency: 5
  }
);

worker.on("completed", (job, result) => {
  console.log(`[transfer-worker] completed ${job.id}`, result?.status, result?.txHash);
});

worker.on("failed", (job, err) => {
  console.error(`[transfer-worker] failed ${job?.id}`, err);
});

console.log("[transfer-worker] started");
EOF

echo "== Patch exports =="

python3 - <<'PY'
from pathlib import Path

p = Path("services/wallet-engine/src/index.ts")
s = p.read_text()

for e in [
    "export * from './chains/index.js';",
    "export * from './signing/index.js';"
]:
    if e not in s:
        s += "\n" + e

p.write_text(s.rstrip() + "\n")
PY

echo "== Build =="

find . -name 'tsconfig.tsbuildinfo' -delete

pnpm install --frozen-lockfile=false

pnpm --filter @zwallet/rpc build
pnpm --filter @zwallet/shared-types build
pnpm --filter @zwallet/wallet-engine build
pnpm --filter @zwallet/admin-wallet build

echo "== Restart services =="

sudo systemctl restart zwallet-transfer-worker
sudo systemctl restart zwallet

sleep 5

sudo systemctl status zwallet-transfer-worker --no-pager
sudo systemctl status zwallet --no-pager

echo "== Health =="

curl -s https://admin-wallet.zeaz.dev/healthz
echo

echo "== Create EVM transfer =="

TRANSFER_ID="$(
curl -s -X POST https://admin-wallet.zeaz.dev/api/transfers/preview \
  -H 'content-type: application/json' \
  -d '{"chain":"evm","from":"0x1111111111111111111111111111111111111111","to":"0x2222222222222222222222222222222222222222","amountAtomic":"1000000000000000000"}' \
  | jq -r '.transfer.id'
)"

echo "Transfer ID: $TRANSFER_ID"

echo "== Queue transfer =="

curl -s -X POST "https://admin-wallet.zeaz.dev/api/transfers/$TRANSFER_ID/queue" | jq

sleep 6

echo "== Verify chain-adapter execution =="

curl -s https://admin-wallet.zeaz.dev/api/overview \
  | jq --arg id "$TRANSFER_ID" '.transfers[] | select(.id == $id)'

echo
echo "== PHASE 8 COMPLETE =="
