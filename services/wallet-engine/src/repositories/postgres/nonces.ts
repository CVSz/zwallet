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
