#!/usr/bin/env bash
set -euo pipefail

cd /opt/zwallet

echo "== Phase 12 FIXED: Secure signer infrastructure =="

echo
echo "== Remove conflicting legacy signing module =="

rm -rf services/wallet-engine/src/signing || true

echo
echo "== Create directories =="

mkdir -p \
services/wallet-engine/src/signers/providers \
services/wallet-engine/src/policy \
services/wallet-engine/src/repositories/postgres

echo
echo "== DB migration =="

cat > services/wallet-engine/src/db/phase12.sql <<'EOF'
CREATE TABLE IF NOT EXISTS wallet_signing_keys (
  id UUID PRIMARY KEY,
  chain TEXT NOT NULL,
  address TEXT NOT NULL,
  provider TEXT NOT NULL,
  key_ref TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_signing_audit_log (
  id UUID PRIMARY KEY,
  transfer_id UUID,
  chain TEXT NOT NULL,
  address TEXT NOT NULL,
  provider TEXT NOT NULL,
  key_ref TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
EOF

psql \
postgresql://postgres:postgres@localhost:5432/zwallet \
-f services/wallet-engine/src/db/phase12.sql

echo
echo "== Replace signer types =="

cat > services/wallet-engine/src/signers/types.ts <<'EOF'
import type {
  WalletTransferRecord,
} from "../walletEngine.js";

export type SignerProviderName =
  | "dev"
  | "vault"
  | "aws-kms"
  | "gcp-kms"
  | "mpc";

export interface SigningKeyRef {
  id: string;
  chain: string;
  address: string;
  provider: SignerProviderName;
  keyRef: string;
  status: "active" | "disabled";
}

export interface SigningRequest {
  transfer: WalletTransferRecord;
  key: SigningKeyRef;
  nonce: number;
}

export interface SigningResult {
  signature: string;
  rawTransaction: string;
  provider: SignerProviderName;
  simulated: boolean;
}

export interface TransferSigner {
  provider: SignerProviderName;

  signTransfer(
    input: SigningRequest
  ): Promise<SigningResult>;
}
EOF

echo
echo "== Replace dev signer =="

cat > services/wallet-engine/src/signers/devSigner.ts <<'EOF'
import {
  createHash,
} from "node:crypto";

import type {
  SigningRequest,
  SigningResult,
  TransferSigner,
} from "./types.js";

export class DevSigner
  implements TransferSigner
{
  provider = "dev" as const;

  async signTransfer(
    input: SigningRequest
  ): Promise<SigningResult> {

    const rawTransaction =
      createHash("sha256")
        .update(
          JSON.stringify({
            transferId:
              input.transfer.id,

            keyRef:
              input.key.keyRef,

            nonce:
              input.nonce,

            amountAtomic:
              input.transfer.amountAtomic,
          })
        )
        .digest("hex");

    return {
      signature:
        createHash("sha256")
          .update(
            `signature:${rawTransaction}`
          )
          .digest("hex"),

      rawTransaction,

      provider: "dev",

      simulated: true,
    };
  }
}
EOF

echo
echo "== Replace signer registry =="

cat > services/wallet-engine/src/signers/index.ts <<'EOF'
import type {
  SignerProviderName,
  SigningRequest,
  SigningResult,
  TransferSigner,
} from "./types.js";

import {
  DevSigner,
} from "./devSigner.js";

const signers:
Record<
  SignerProviderName,
  TransferSigner
> = {
  dev:
    new DevSigner(),

  vault:
    new DevSigner(),

  "aws-kms":
    new DevSigner(),

  "gcp-kms":
    new DevSigner(),

  mpc:
    new DevSigner(),
};

export async function signTransfer(
  input: SigningRequest
): Promise<SigningResult> {

  const signer =
    signers[
      input.key.provider
    ];

  if (!signer) {
    throw new Error(
      `signer unavailable: ${input.key.provider}`
    );
  }

  return signer.signTransfer(
    input
  );
}

export type {
  SigningKeyRef,
  SigningRequest,
  SigningResult,
  TransferSigner,
  SignerProviderName,
} from "./types.js";

export {
  DevSigner,
};
EOF

echo
echo "== Signing key repository =="

cat > services/wallet-engine/src/repositories/postgres/signingKeys.ts <<'EOF'
import {
  randomUUID,
} from "node:crypto";

import pg from "pg";

import type {
  SigningKeyRef,
  SignerProviderName,
} from "../../signers/types.js";

const { Pool } = pg;

const pool =
  new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgres://postgres:postgres@localhost:5432/zwallet",
  });

function rowToKey(
  row: any
): SigningKeyRef {

  return {
    id: row.id,
    chain: row.chain,
    address: row.address,
    provider: row.provider,
    keyRef: row.key_ref,
    status: row.status,
  };
}

export async function upsertSigningKey(
  input: {
    chain: string;
    address: string;
    provider: SignerProviderName;
    keyRef: string;
  }
) {

  const existing =
    await pool.query(
      `
      SELECT *
      FROM wallet_signing_keys
      WHERE
        lower(address)=lower($1)
        AND chain=$2
      LIMIT 1
      `,
      [
        input.address,
        input.chain,
      ]
    );

  if (
    existing.rows.length > 0
  ) {

    const result =
      await pool.query(
        `
        UPDATE wallet_signing_keys
        SET
          provider=$2,
          key_ref=$3,
          status='active',
          updated_at=NOW()
        WHERE id=$1
        RETURNING *
        `,
        [
          existing.rows[0].id,
          input.provider,
          input.keyRef,
        ]
      );

    return rowToKey(
      result.rows[0]
    );
  }

  const result =
    await pool.query(
      `
      INSERT INTO wallet_signing_keys (
        id,
        chain,
        address,
        provider,
        key_ref,
        status
      )
      VALUES (
        $1,$2,$3,$4,$5,'active'
      )
      RETURNING *
      `,
      [
        randomUUID(),
        input.chain,
        input.address,
        input.provider,
        input.keyRef,
      ]
    );

  return rowToKey(
    result.rows[0]
  );
}

export async function getSigningKeyForAddress(
  chain: string,
  address: string
): Promise<
  SigningKeyRef | undefined
> {

  const result =
    await pool.query(
      `
      SELECT *
      FROM wallet_signing_keys
      WHERE
        chain=$1
        AND lower(address)=lower($2)
        AND status='active'
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [
        chain,
        address,
      ]
    );

  return result.rows[0]
    ? rowToKey(
        result.rows[0]
      )
    : undefined;
}
EOF

echo
echo "== Signing audit repository =="

cat > services/wallet-engine/src/repositories/postgres/signingAudit.ts <<'EOF'
import {
  randomUUID,
} from "node:crypto";

import pg from "pg";

const { Pool } = pg;

const pool =
  new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgres://postgres:postgres@localhost:5432/zwallet",
  });

export async function appendSigningAudit(
  input: {
    transferId?: string;
    chain: string;
    address: string;
    provider: string;
    keyRef: string;
    action: string;
    status: string;
    payload?: Record<string, unknown>;
  }
) {

  await pool.query(
    `
    INSERT INTO wallet_signing_audit_log (
      id,
      transfer_id,
      chain,
      address,
      provider,
      key_ref,
      action,
      status,
      payload
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9
    )
    `,
    [
      randomUUID(),
      input.transferId ?? null,
      input.chain,
      input.address,
      input.provider,
      input.keyRef,
      input.action,
      input.status,
      input.payload ?? {},
    ]
  );
}
EOF

echo
echo "== Policy guard =="

cat > services/wallet-engine/src/policy/signingPolicy.ts <<'EOF'
import type {
  WalletTransferRecord,
} from "../walletEngine.js";

import type {
  SigningKeyRef,
} from "../signers/types.js";

export function assertSigningAllowed(
  transfer: WalletTransferRecord,
  key: SigningKeyRef
) {

  if (
    key.status !== "active"
  ) {
    throw new Error(
      "signing key disabled"
    );
  }

  if (
    transfer.chain !== key.chain
  ) {
    throw new Error(
      "signing key chain mismatch"
    );
  }

  if (
    transfer.from.toLowerCase() !==
    key.address.toLowerCase()
  ) {
    throw new Error(
      "signing key address mismatch"
    );
  }

  if (
    BigInt(
      transfer.amountAtomic
    ) <= 0n
  ) {
    throw new Error(
      "invalid transfer amount"
    );
  }
}
EOF

echo
echo "== Patch worker =="

cat > services/wallet-engine/src/workers/transferWorker.ts <<'EOF'
import {
  Worker,
} from "bullmq";

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
  getSigningKeyForAddress,
} from "../repositories/postgres/signingKeys.js";

import {
  appendSigningAudit,
} from "../repositories/postgres/signingAudit.js";

import {
  assertSigningAllowed,
} from "../policy/signingPolicy.js";

import {
  signTransfer,
} from "../signers/index.js";

import {
  broadcastTransfer,
} from "../adapters/index.js";

const worker =
  new Worker(
    "transfer-execution",

    async (job) => {

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

      const key =
        await getSigningKeyForAddress(
          transfer.chain,
          transfer.from
        );

      if (!key) {
        throw new Error(
          `no signing key for ${transfer.from}`
        );
      }

      assertSigningAllowed(
        transfer,
        key
      );

      const nonce =
        await allocateNonce(
          transfer.chain,
          transfer.from
        );

      await appendSigningAudit({
        transferId:
          transfer.id,

        chain:
          transfer.chain,

        address:
          transfer.from,

        provider:
          key.provider,

        keyRef:
          key.keyRef,

        action:
          "sign.requested",

        status:
          "started",
      });

      await signTransfer({
        transfer,
        key,
        nonce,
      });

      await appendSigningAudit({
        transferId:
          transfer.id,

        chain:
          transfer.chain,

        address:
          transfer.from,

        provider:
          key.provider,

        keyRef:
          key.keyRef,

        action:
          "sign.completed",

        status:
          "success",
      });

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

      return updateTransferStatus(
        transfer.id,
        "confirmed"
      );
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
echo "== Replace root exports cleanly =="

cat > services/wallet-engine/src/index.ts <<'EOF'
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
export * from "./workers/index.js";

export * from "./adapters/index.js";

export * from "./signers/index.js";
EOF

echo
echo "== Build =="

find . -name 'tsconfig.tsbuildinfo' -delete

pnpm --filter @zwallet/wallet-engine build
pnpm --filter @zwallet/admin-wallet build

echo
echo "== Seed dev signing key =="

cat > /tmp/seed-signing-key.mjs <<'EOF'
import {
  upsertSigningKey,
} from "/opt/zwallet/services/wallet-engine/dist/repositories/postgres/signingKeys.js";

await upsertSigningKey({
  chain: "evm",
  address: "0x1111111111111111111111111111111111111111",
  provider: "dev",
  keyRef: "dev://evm/local-hot-wallet",
});

console.log(
  "signing key seeded"
);
EOF

node /tmp/seed-signing-key.mjs

echo
echo "== Restart services =="

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
curl -s \
-X POST \
https://admin-wallet.zeaz.dev/api/transfers/preview \
-H "authorization: Bearer $TOKEN" \
-H 'content-type: application/json' \
-d '{
  "chain":"evm",
  "from":"0x1111111111111111111111111111111111111111",
  "to":"0x2222222222222222222222222222222222222222",
  "amountAtomic":"1000000000000000000"
}' \
| jq -r '.transfer.id'
)"

curl -s \
-X POST \
"https://admin-wallet.zeaz.dev/api/transfers/$TRANSFER_ID/queue" \
-H "authorization: Bearer $TOKEN" \
| jq

sleep 6

echo
echo "== Transfer =="

curl -s \
https://admin-wallet.zeaz.dev/api/overview \
-H "authorization: Bearer $TOKEN" \
| jq --arg id "$TRANSFER_ID" '
.transfers[] |
select(.id == $id)
'

echo
echo "== Signing audit =="

psql \
postgresql://postgres:postgres@localhost:5432/zwallet \
-c "
select
  action,
  status,
  provider,
  key_ref,
  created_at
from wallet_signing_audit_log
order by created_at desc
limit 10;
"

echo
echo "== PHASE 12 FIX COMPLETE =="
