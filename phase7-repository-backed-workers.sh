#!/usr/bin/env bash
set -euo pipefail

cd /opt/zwallet

echo "== Phase 7: Repository-backed distributed transfer workers =="

echo "== Create repository/service files =="

mkdir -p services/wallet-engine/src/repositories/postgres
mkdir -p services/wallet-engine/src/services/overview

cat > services/wallet-engine/src/repositories/postgres/transfers.ts <<'EOF'
import pg from "pg";
import type { WalletTransferRecord } from "../../walletEngine.js";

const { Pool } = pg;

function rowToTransfer(row: Record<string, unknown>): WalletTransferRecord {
  const transfer: WalletTransferRecord = {
    id: String(row.id),
    digest: String(row.digest),
    chain: row.chain as WalletTransferRecord["chain"],
    from: String(row.from_address),
    to: String(row.to_address),
    amountAtomic: String(row.amount_atomic),
    nonce: Number(row.nonce ?? 0),
    status: row.status as WalletTransferRecord["status"],
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };

  if (row.tx_hash) transfer.txHash = String(row.tx_hash);
  if (row.failure_reason) transfer.failureReason = String(row.failure_reason);

  return transfer;
}

export class PostgresTransferRepository {
  private readonly pool: pg.Pool;

  constructor(connectionString = process.env.DATABASE_URL ?? "") {
    if (!connectionString) {
      throw new Error("DATABASE_URL is required for PostgresTransferRepository");
    }

    this.pool = new Pool({ connectionString });
  }

  async getById(id: string): Promise<WalletTransferRecord | undefined> {
    const result = await this.pool.query(
      `SELECT * FROM wallet_transfers WHERE id = $1`,
      [id]
    );

    const row = result.rows[0];

    return row ? rowToTransfer(row) : undefined;
  }

  async list(): Promise<WalletTransferRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM wallet_transfers ORDER BY created_at DESC`
    );

    return result.rows.map(rowToTransfer);
  }

  async upsert(record: WalletTransferRecord): Promise<WalletTransferRecord> {
    await this.pool.query(
      `
      INSERT INTO wallet_transfers (
        id,
        digest,
        chain,
        from_address,
        to_address,
        amount_atomic,
        nonce,
        status,
        tx_hash,
        failure_reason,
        created_at,
        updated_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      )
      ON CONFLICT (id) DO UPDATE SET
        digest = EXCLUDED.digest,
        chain = EXCLUDED.chain,
        from_address = EXCLUDED.from_address,
        to_address = EXCLUDED.to_address,
        amount_atomic = EXCLUDED.amount_atomic,
        nonce = EXCLUDED.nonce,
        status = EXCLUDED.status,
        tx_hash = EXCLUDED.tx_hash,
        failure_reason = EXCLUDED.failure_reason,
        updated_at = EXCLUDED.updated_at
      `,
      [
        record.id,
        record.digest,
        record.chain,
        record.from,
        record.to,
        record.amountAtomic,
        record.nonce,
        record.status,
        record.txHash ?? null,
        record.failureReason ?? null,
        record.createdAt,
        record.updatedAt
      ]
    );

    return record;
  }

  async updateStatus(
    id: string,
    status: WalletTransferRecord["status"],
    options: {
      txHash?: string;
      failureReason?: string;
    } = {}
  ): Promise<WalletTransferRecord> {
    const existing = await this.getById(id);

    if (!existing) {
      throw new Error(`Transfer not found: ${id}`);
    }

    const updated: WalletTransferRecord = {
      ...existing,
      status,
      updatedAt: new Date().toISOString()
    };

    if (options.txHash) updated.txHash = options.txHash;
    if (options.failureReason) updated.failureReason = options.failureReason;

    return this.upsert(updated);
  }
}
EOF

cat > services/wallet-engine/src/repositories/postgres/overview.ts <<'EOF'
import pg from "pg";
import type {
  WalletAccount,
  WalletBalance,
  WalletEventRecord,
  WalletOverview,
  WalletTransferRecord
} from "../../walletEngine.js";

const { Pool } = pg;

function rowToAccount(row: Record<string, unknown>): WalletAccount {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    chain: row.chain as WalletAccount["chain"],
    address: String(row.address),
    label: String(row.label ?? "Wallet"),
    status: row.status as WalletAccount["status"],
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

function rowToBalance(row: Record<string, unknown>): WalletBalance {
  return {
    accountId: String(row.account_id),
    chain: row.chain as WalletBalance["chain"],
    asset: String(row.asset_symbol),
    amountAtomic: String(row.amount_atomic),
    decimals: Number(row.decimals ?? 18),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

function rowToTransfer(row: Record<string, unknown>): WalletTransferRecord {
  const transfer: WalletTransferRecord = {
    id: String(row.id),
    digest: String(row.digest),
    chain: row.chain as WalletTransferRecord["chain"],
    from: String(row.from_address),
    to: String(row.to_address),
    amountAtomic: String(row.amount_atomic),
    nonce: Number(row.nonce ?? 0),
    status: row.status as WalletTransferRecord["status"],
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };

  if (row.tx_hash) transfer.txHash = String(row.tx_hash);
  if (row.failure_reason) transfer.failureReason = String(row.failure_reason);

  return transfer;
}

function rowToEvent(row: Record<string, unknown>): WalletEventRecord {
  return {
    id: String(row.id),
    type: row.type as WalletEventRecord["type"],
    chain: String(row.chain ?? "evm") as WalletEventRecord["chain"],
    userId: String(row.user_id ?? "system"),
    payload: row.payload as Record<string, unknown>,
    occurredAt: new Date(String(row.created_at)).toISOString()
  };
}

export class PostgresOverviewRepository {
  private readonly pool: pg.Pool;

  constructor(connectionString = process.env.DATABASE_URL ?? "") {
    if (!connectionString) {
      throw new Error("DATABASE_URL is required for PostgresOverviewRepository");
    }

    this.pool = new Pool({ connectionString });
  }

  async getOverview(): Promise<WalletOverview> {
    const [accounts, balances, transfers, events] = await Promise.all([
      this.pool.query(`SELECT * FROM wallet_accounts ORDER BY created_at ASC`),
      this.pool.query(`
        SELECT
          b.account_id,
          a.chain,
          b.asset_symbol,
          b.amount_atomic,
          COALESCE(b.decimals, CASE WHEN a.chain = 'bitcoin' THEN 8 WHEN a.chain = 'solana' THEN 9 ELSE 18 END) AS decimals,
          b.updated_at
        FROM wallet_balances b
        JOIN wallet_accounts a ON a.id = b.account_id
        ORDER BY a.chain ASC
      `),
      this.pool.query(`SELECT * FROM wallet_transfers ORDER BY created_at DESC`),
      this.pool.query(`SELECT * FROM wallet_events ORDER BY created_at DESC LIMIT 100`)
    ]);

    return {
      accounts: accounts.rows.map(rowToAccount),
      balances: balances.rows.map(rowToBalance),
      transfers: transfers.rows.map(rowToTransfer),
      events: events.rows.map(rowToEvent)
    };
  }
}
EOF

cat > services/wallet-engine/src/services/overview/index.ts <<'EOF'
import { getWalletOverview, type WalletOverview } from "../../walletEngine.js";
import { PostgresOverviewRepository } from "../../repositories/postgres/overview.js";

export async function getRuntimeWalletOverview(): Promise<WalletOverview> {
  if (!process.env.DATABASE_URL) {
    return getWalletOverview();
  }

  const repo = new PostgresOverviewRepository();

  return repo.getOverview();
}
EOF

echo "== Patch schema for missing columns =="

cat >> services/wallet-engine/src/db/schema.sql <<'EOF'

ALTER TABLE wallet_balances
ADD COLUMN IF NOT EXISTS decimals INTEGER;

ALTER TABLE wallet_transfers
ADD COLUMN IF NOT EXISTS tx_hash TEXT;

ALTER TABLE wallet_transfers
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

ALTER TABLE wallet_transfers
ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ;

ALTER TABLE wallet_transfers
ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ;
EOF

echo "== Patch queue job back to transferId-only =="

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

echo "== Patch worker to load/update PostgreSQL =="

cat > services/wallet-engine/src/workers/transferWorker.ts <<'EOF'
import { Worker } from "bullmq";

import { redisConnection } from "../queue/redis.js";
import { PostgresTransferRepository } from "../repositories/postgres/transfers.js";

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

    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (BigInt(transfer.amountAtomic) <= 0n) {
      return repo.updateStatus(transfer.id, "failed", {
        failureReason: "amountAtomic must be positive"
      });
    }

    return repo.updateStatus(transfer.id, "confirmed", {
      txHash: `simulated-${transfer.id}`
    });
  },
  {
    connection: redisConnection,
    concurrency: 5
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

echo "== Patch admin-wallet imports/overview/queue =="

python3 - <<'PY'
from pathlib import Path

p = Path("apps/admin-wallet/src/server.ts")
s = p.read_text()

# add runtime overview import if missing
if 'getRuntimeWalletOverview' not in s:
    s = s.replace(
        'import { isSupportedChain, type SupportedChain } from "@zwallet/shared-types/wallet";',
        'import { isSupportedChain, type SupportedChain } from "@zwallet/shared-types/wallet";\nimport { getRuntimeWalletOverview } from "@zwallet/wallet-engine";'
    )

# replace overview render source
s = s.replace(
    "const overview = getWalletOverview();",
    "const overview = await getRuntimeWalletOverview();"
)

# renderHtml must become async
s = s.replace(
    "function renderHtml(): string {",
    "async function renderHtml(): Promise<string> {"
)

# sendHtml must await renderHtml
s = s.replace(
    "function sendHtml(res: http.ServerResponse): void {\n  res.writeHead(200, { \"content-type\": \"text/html; charset=utf-8\", \"cache-control\": \"no-store\", \"x-frame-options\": \"DENY\", \"x-content-type-options\": \"nosniff\" });\n  res.end(renderHtml());\n}",
    "async function sendHtml(res: http.ServerResponse): Promise<void> {\n  res.writeHead(200, { \"content-type\": \"text/html; charset=utf-8\", \"cache-control\": \"no-store\", \"x-frame-options\": \"DENY\", \"x-content-type-options\": \"nosniff\" });\n  res.end(await renderHtml());\n}"
)

# get overview endpoint async repository-backed
s = s.replace(
    'if (req.method === "GET" && url.pathname === "/api/overview") return sendJson(res, 200, getWalletOverview());',
    'if (req.method === "GET" && url.pathname === "/api/overview") return sendJson(res, 200, await getRuntimeWalletOverview());'
)

# queue endpoint should enqueue transferId only
s = s.replace(
    """      const job = await enqueueTransferExecution(
        queued
      );""",
    """      const job = await enqueueTransferExecution({
        transferId: queued.id
      });"""
)

# sendHtml call must await
s = s.replace(
    'if (req.method === "GET" || req.method === "HEAD") return sendHtml(res);',
    'if (req.method === "GET" || req.method === "HEAD") return await sendHtml(res);'
)

p.write_text(s)
PY

echo "== Patch exports =="

python3 - <<'PY'
from pathlib import Path

p = Path("services/wallet-engine/src/index.ts")
s = p.read_text()

exports = [
    "export * from './repositories/postgres/transfers.js';",
    "export * from './repositories/postgres/overview.js';",
    "export * from './services/overview/index.js';"
]

for e in exports:
    if e not in s:
        s += "\n" + e

p.write_text(s.rstrip() + "\n")
PY

echo "== Apply migration =="

export DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/zwallet}"
node services/wallet-engine/dist/db/migrate.js || true

echo "== Clean and build =="

find . -name 'tsconfig.tsbuildinfo' -delete

pnpm install --frozen-lockfile=false

pnpm --filter @zwallet/rpc build
pnpm --filter @zwallet/shared-types build
pnpm --filter @zwallet/wallet-engine build
pnpm --filter @zwallet/admin-wallet build

echo "== Re-run migration from fresh build =="

export DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/zwallet}"
node services/wallet-engine/dist/db/migrate.js

echo "== Update systemd env =="

sudo mkdir -p /etc/zwallet

sudo tee /etc/zwallet/admin-wallet.env >/dev/null <<EOF
NODE_ENV=production
PORT=8081
DATABASE_URL=${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/zwallet}
REDIS_URL=redis://127.0.0.1:6379
EOF

sudo tee /etc/systemd/system/zwallet.service >/dev/null <<'EOF'
[Unit]
Description=zWallet runtime
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=zeazdev
WorkingDirectory=/opt/zwallet
EnvironmentFile=/etc/zwallet/admin-wallet.env
ExecStart=/usr/bin/node /opt/zwallet/apps/admin-wallet/dist/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/zwallet-transfer-worker.service >/dev/null <<'EOF'
[Unit]
Description=zWallet transfer worker
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=zeazdev
WorkingDirectory=/opt/zwallet
EnvironmentFile=/etc/zwallet/admin-wallet.env
ExecStart=/usr/bin/node /opt/zwallet/services/wallet-engine/dist/runTransferWorker.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "== Restart services =="

sudo systemctl daemon-reload
sudo systemctl enable zwallet-transfer-worker
sudo systemctl restart zwallet-transfer-worker
sudo systemctl restart zwallet

sleep 5

echo "== Status =="

sudo systemctl status zwallet-transfer-worker --no-pager
sudo systemctl status zwallet --no-pager

echo "== Health =="

curl -s https://admin-wallet.zeaz.dev/healthz
echo

echo "== Create persistent transfer preview =="

TRANSFER_ID="$(
curl -s -X POST https://admin-wallet.zeaz.dev/api/transfers/preview \
  -H 'content-type: application/json' \
  -d '{"chain":"evm","from":"0x1111111111111111111111111111111111111111","to":"0x2222222222222222222222222222222222222222","amountAtomic":"1000000000000000000"}' \
  | jq -r '.transfer.id'
)"

echo "Transfer ID: $TRANSFER_ID"

echo "== Queue transfer by ID only =="

curl -s -X POST \
  "https://admin-wallet.zeaz.dev/api/transfers/$TRANSFER_ID/queue" \
  | jq

echo "== Wait for worker =="

sleep 6

echo "== Verify persisted worker update =="

curl -s https://admin-wallet.zeaz.dev/api/overview \
  | jq --arg id "$TRANSFER_ID" '.transfers[] | select(.id == $id)'

echo "== Restart services and verify it survived =="

sudo systemctl restart zwallet-transfer-worker
sudo systemctl restart zwallet

sleep 5

curl -s https://admin-wallet.zeaz.dev/api/overview \
  | jq --arg id "$TRANSFER_ID" '.transfers[] | select(.id == $id)'

echo
echo "== PHASE 7 COMPLETE =="
