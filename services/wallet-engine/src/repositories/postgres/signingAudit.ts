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
