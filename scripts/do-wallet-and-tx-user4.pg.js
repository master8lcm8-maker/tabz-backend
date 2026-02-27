require("dotenv/config");
const { Client } = require("pg");

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const userId = 4; // claimer from your drop row
  const since = "2026-02-24T05:00:00.000Z";

  // 1) Find the user's wallet(s)
  const wallets = await c.query(`
    SELECT id, "userId", "balanceCents", "createdAt", "updatedAt"
    FROM wallets
    WHERE "userId" = $1
    ORDER BY id ASC
  `, [userId]);

  console.log("WALLETS:");
  console.log(JSON.stringify(wallets.rows, null, 2));

  // 2) Pull recent wallet tx for those wallets (if any)
  const walletIds = wallets.rows.map(w => w.id);
  if (walletIds.length === 0) {
    console.log("NO WALLET FOUND FOR userId=" + userId);
    await c.end();
    return;
  }

  const tx = await c.query(`
    SELECT id, "walletId", type, "amountCents", metadata, "createdAt"
    FROM wallet_transactions
    WHERE "walletId" = ANY($1::int[])
      AND "createdAt" >= $2
    ORDER BY "createdAt" DESC
    LIMIT 200
  `, [walletIds, since]);

  console.log("WALLET_TX:");
  console.log(JSON.stringify(tx.rows, null, 2));

  await c.end();
})().catch(e => { console.error(e); process.exit(1); });