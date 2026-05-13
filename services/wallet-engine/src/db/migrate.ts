import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  await client.connect();

  const schemaPath = path.resolve(
    process.cwd(),
    "services/wallet-engine/src/db/schema.sql"
  );

  const sql = fs.readFileSync(schemaPath, "utf8");

  await client.query(sql);

  await client.end();

  console.log("wallet-engine schema migrated");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
