#!/usr/bin/env bash
set -euo pipefail

cd /opt/zwallet

echo "== Phase 11: Nonce manager + pending tx tracking =="

echo
echo "== Create DB migration =="

mkdir -p services/wallet-engine/src/db

cat > services/wallet-engine/src/db/phase11.sql <<'EOF'
CREATE TABLE IF NOT EXISTS wallet_nonces (
  address TEXT PRIMARY KEY,
  chain TEXT NOT NULL,
  next_nonce BIGINT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_pending_transactions (
  transfer_id UUID PRIMARY KEY,
  tx_hash TEXT NOT NULL,
  chain TEXT NOT NULL,
  nonce BIGINT NOT NULL,
  status TEXT NOT NULL,
  last_checked_block BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
EOF

psql \
postgresql://postgres:postgres@localhost:5432/zwallet \
-f services/wallet-engine/src/db/phase11.sql

echo
echo "== Create nonce repository =="

mkdir -p \
services/wallet-engine/src/repositories/postgres

cat > services/wallet-engine/src/repositories/postgres/nonces.ts <<'EOF'
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/zwallet",
});

export async function allocateNonce(
  chain: string,
  address: string
): Promise<number> {
  const client =
    await pool.connect();

  try {
    await client.query("BEGIN");

    const existing =
      await client.query(
        `
        SELECT *
        FROM wallet_nonces
        WHERE address = $1
        FOR UPDATE
        `,
        [address]
      );

    let nonce = 0;

    if (
      existing.rows.length === 0
    ) {
      await client.query(
        `
        INSERT INTO wallet_nonces (
          address,
          chain,
          next_nonce
        )
        VALUES ($1,$2,$3)
        `,
        [
          address,
          chain,
          1,
        ]
      );

      nonce = 0;
    } else {
      nonce =
        Number(
          existing.rows[0]
            .next_nonce
        );

      await client.query(
        `
        UPDATE wallet_nonces
        SET
          next_nonce = $2,
          updated_at = NOW()
        WHERE address = $1
        `,
        [
          address,
          nonce + 1,
        ]
      );
    }

    await client.query(
      "COMMIT"
    );

    return nonce;
  } catch (err) {
    await client.query(
      "ROLLBACK"
    );

    throw err;
  } finally {
    client.release();
  }
}
EOF

echo
echo "== Create pending tx repository =="

cat > services/wallet-engine/src/repositories/postgres/pendingTransactions.ts <<'EOF'
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/zwallet",
});

export async function createPendingTransaction(
  input: {
    transferId: string;
    txHash: string;
    chain: string;
    nonce: number;
  }
) {
  await pool.query(
    `
    INSERT INTO wallet_pending_transactions (
      transfer_id,
      tx_hash,
      chain,
      nonce,
      status
    )
    VALUES ($1,$2,$3,$4,$5)
    `,
    [
      input.transferId,
      input.txHash,
      input.chain,
      input.nonce,
      "pending",
    ]
  );
}

export async function markPendingConfirmed(
  transferId: string
) {
  await pool.query(
    `
    UPDATE wallet_pending_transactions
    SET
      status = 'confirmed',
      updated_at = NOW()
    WHERE transfer_id = $1
    `,
    [transferId]
  );
}
EOF

echo
echo "== Patch transfer worker =="

cat > services/wallet-engine/src/workers/transferWorker.ts <<'EOF'
import { Worker } from "bullmq";

import {
  createRedisConnection,
} from "../queue/redis.js";

import {
  getTransferById,
  updateTransferStatus,
} from "../repositories/postgres/transfers.js";

import {
  allocateNonce,
} from "../repositories/postgres/nonces.js";

import {
  createPendingTransaction,
  markPendingConfirmed,
} from "../repositories/postgres/pendingTransactions.js";

import {
  broadcastTransfer,
} from "../adapters/index.js";

const worker =
  new Worker(
    "transfer-execution",

    async (job) => {
      console.log(
        "[transfer-worker] received",
        job.id
      );

      const transfer =
        await getTransferById(
          String(
            job.data.transferId
          )
        );

      if (!transfer) {
        throw new Error(
          "transfer not found"
        );
      }

      await updateTransferStatus(
        transfer.id,
        "executing"
      );

      const nonce =
        await allocateNonce(
          transfer.chain,
          transfer.from
        );

      const broadcast =
        await broadcastTransfer({
          ...transfer,
          nonce,
        });

      await createPendingTransaction({
        transferId:
          transfer.id,

        txHash:
          broadcast.txHash,

        chain:
          transfer.chain,

        nonce,
      });

      await updateTransferStatus(
        transfer.id,
        "broadcasted",
        {
          txHash:
            broadcast.txHash,
        }
      );

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            2000
          )
      );

      await markPendingConfirmed(
        transfer.id
      );

      const updated =
        await updateTransferStatus(
          transfer.id,
          "confirmed"
        );

      console.log(
        "[transfer-worker] confirmed",
        updated.id
      );

      return updated;
    },

    {
      connection:
        createRedisConnection(),
      concurrency: 5,
    }
  );

console.log(
  "[wallet-engine] transfer worker online"
);
EOF

echo
echo "== Patch exports =="

python3 - <<'PY'
from pathlib import Path

p = Path(
  "services/wallet-engine/src/index.ts"
)

s = p.read_text()

exports = [
    'export * from "./repositories/postgres/nonces.js";',
    'export * from "./repositories/postgres/pendingTransactions.js";',
]

for e in exports:
    if e not in s:
        s += "\n" + e

p.write_text(s.rstrip() + "\n")
PY

echo
echo "== Clean build cache =="

find . -name 'tsconfig.tsbuildinfo' -delete

echo
echo "== Build =="

pnpm --filter @zwallet/wallet-engine build
pnpm --filter @zwallet/admin-wallet build

echo
echo "== Restart =="

sudo systemctl restart \
  zwallet-transfer-worker

sudo systemctl restart \
  zwallet

sleep 5

echo
echo "== Validate =="

export TOKEN="$(
ZWALLET_DEV_TOKEN=change-me-local-admin-token \
node apps/admin-wallet/scripts/create-dev-token.mjs
)"

TRANSFER_ID="$(
curl -s -X POST \
https://admin-wallet.zeaz.dev/api/transfers/preview \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"chain":"evm","from":"0x1111111111111111111111111111111111111111","to":"0x2222222222222222222222222222222222222222","amountAtomic":"1000000000000000000"}' \
| jq -r '.transfer.id'
)"

curl -s -X POST \
"https://admin-wallet.zeaz.dev/api/transfers/$TRANSFER_ID/queue" \
-H "authorization: Bearer $TOKEN" \
| jq

sleep 5

echo
echo "== Final transfer =="

curl -s \
https://admin-wallet.zeaz.dev/api/overview \
-H "authorization: Bearer $TOKEN" \
| jq --arg id "$TRANSFER_ID" '
.transfers[] | select(.id == $id)
'

echo
echo "== Pending tx table =="

psql \
postgresql://postgres:postgres@localhost:5432/zwallet \
-c "
select *
from wallet_pending_transactions
order by created_at desc
limit 5;
"

echo
echo "== Nonce table =="

psql \
postgresql://postgres:postgres@localhost:5432/zwallet \
-c "
select *
from wallet_nonces;
"

echo
echo "== PHASE 11 COMPLETE =="
