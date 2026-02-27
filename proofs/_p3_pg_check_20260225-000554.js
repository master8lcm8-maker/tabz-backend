require('dotenv/config');
const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const since = process.argv[2];
  const dropId = Number(process.argv[3]);

  const drop = (await c.query(
    'SELECT id, \"claimedByUserId\", \"rewardCents\", \"createdAt\", \"claimedAt\" FROM freeboard_drops WHERE id = $1',
    [dropId]
  )).rows[0];

  const userId = Number(drop.claimedByUserId);

  const wallet = (await c.query(
    'SELECT id, \"userId\", \"balanceCents\", \"spendableBalanceCents\", \"updatedAt\" FROM wallets WHERE \"userId\" = $1',
    [userId]
  )).rows[0];

  const tx = wallet ? (await c.query(
    'SELECT id, \"walletId\", type, \"amountCents\", metadata, \"createdAt\" FROM wallet_transactions WHERE \"walletId\" = $1 AND \"createdAt\" >= $2 ORDER BY \"createdAt\" DESC LIMIT 50',
    [wallet.id, since]
  )).rows : [];

  console.log(JSON.stringify({ since, drop, wallet, tx }, null, 2));
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });