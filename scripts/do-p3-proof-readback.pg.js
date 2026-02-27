require("dotenv/config");
const { Client } = require("pg");

(async () => {
  const claimCode = process.argv[2];
  const since = process.argv[3];

  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const dropQ = await c.query(
    'SELECT id, "claimedByUserId", "rewardCents", status, "createdAt", "claimedAt", "claimCode" FROM freeboard_drops WHERE "claimCode" = $1',
    [claimCode]
  );

  const drop = dropQ.rows[0] || null;

  let wallet = null;
  let tx = [];
  if (drop && drop.claimedByUserId != null) {
    const w = await c.query('SELECT id, "userId", "balanceCents", "spendableBalanceCents", "updatedAt" FROM wallets WHERE "userId" = $1', [drop.claimedByUserId]);
    wallet = w.rows[0] || null;
    if (wallet) {
      const t = await c.query(
        'SELECT id, "walletId", type, "amountCents", metadata, "createdAt" FROM wallet_transactions WHERE "walletId" = $1 AND "createdAt" >= $2 ORDER BY "createdAt" DESC LIMIT 50',
        [wallet.id, since]
      );
      tx = t.rows;
    }
  }

  console.log(JSON.stringify({ claimCode, since, dropRowCount: dropQ.rowCount, drop, wallet, tx }, null, 2));
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });