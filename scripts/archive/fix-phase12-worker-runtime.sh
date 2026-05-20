#!/usr/bin/env bash
set -euo pipefail

cd /opt/zwallet

echo "== Phase 12 runtime diagnostics =="

echo
echo "== Worker logs =="

sudo journalctl \
-u zwallet-transfer-worker \
-n 120 \
--no-pager

echo
echo "== Verify signing key exists =="

psql \
postgresql://postgres:postgres@localhost:5432/zwallet \
-c "
select
  id,
  chain,
  address,
  provider,
  key_ref,
  status
from wallet_signing_keys;
"

echo
echo "== Verify pending executing transfers =="

psql \
postgresql://postgres:postgres@localhost:5432/zwallet \
-c "
select
  id,
  status,
  tx_hash,
  created_at
from wallet_transfers
order by created_at desc
limit 10;
"

echo
echo "== Patch worker with runtime safety logging =="

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

      console.log(
        "[worker] received",
        job.id,
        job.data
      );

      try {

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

        console.log(
          "[worker] transfer loaded",
          transfer.id
        );

        await updateTransferStatus(
          transfer.id,
          "executing"
        );

        const key =
          await getSigningKeyForAddress(
            transfer.chain,
            transfer.from
          );

        console.log(
          "[worker] signing key",
          key
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

        console.log(
          "[worker] policy passed"
        );

        const nonce =
          await allocateNonce(
            transfer.chain,
            transfer.from
          );

        console.log(
          "[worker] nonce allocated",
          nonce
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

        console.log(
          "[worker] sign.requested audit written"
        );

        const signed =
          await signTransfer({
            transfer,
            key,
            nonce,
          });

        console.log(
          "[worker] signed",
          signed.provider
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
            "sign.completed",

          status:
            "success",

          payload: {
            provider:
              signed.provider,

            simulated:
              signed.simulated,
          },
        });

        console.log(
          "[worker] sign.completed audit written"
        );

        const broadcast =
          await broadcastTransfer({
            ...transfer,
            nonce,
          });

        console.log(
          "[worker] broadcast complete",
          broadcast.txHash
        );

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
          "[worker] confirmed",
          updated.id
        );

        return updated;

      } catch (err) {

        console.error(
          "[worker] fatal error",
          err
        );

        throw err;
      }
    },

    {
      connection:
        createRedisConnection(),

      concurrency: 5,
    }
  );

worker.on(
  "completed",
  (job) => {
    console.log(
      "[worker] completed",
      job.id
    );
  }
);

worker.on(
  "failed",
  (job, err) => {
    console.error(
      "[worker] failed",
      job?.id,
      err
    );
  }
);

console.log(
  "[wallet-engine] transfer worker online"
);
EOF

echo
echo "== Clean cache =="

find . -name 'tsconfig.tsbuildinfo' -delete

echo
echo "== Rebuild =="

pnpm --filter @zwallet/wallet-engine build
pnpm --filter @zwallet/admin-wallet build

echo
echo "== Restart services =="

sudo systemctl restart \
  zwallet-transfer-worker

sudo systemctl restart \
  zwallet

sleep 5

echo
echo "== Tail live worker logs =="

sudo journalctl \
-u zwallet-transfer-worker \
-f
