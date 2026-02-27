require("dotenv/config");
const { Client } = require("pg");

(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await c.connect();

  const since = "2026-02-24T00:00:00.000Z";
  const sql = `
    SELECT id, "walletId", type, "amountCents", metadata, "createdAt"
    FROM wallet_transactions
    WHERE "createdAt" >= $1
    ORDER BY "createdAt" DESC
    LIMIT 50
  `;

  const res = await c.query(sql, [since]);
  console.log(JSON.stringify(res.rows, null, 2));

  await c.end();
})().catch(e => { console.error(e); process.exit(1); });