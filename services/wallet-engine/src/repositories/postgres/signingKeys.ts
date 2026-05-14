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
