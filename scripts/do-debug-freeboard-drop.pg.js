require("dotenv/config");
const { Client } = require("pg");

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const id = Number(process.argv[2]);

  const one = await c.query(
    'SELECT id, "claimedByUserId", "rewardCents", status, "createdAt", "claimedAt", "claimCode" FROM freeboard_drops WHERE id = $1',
    [id]
  );

  const last = await c.query(
    'SELECT id, "claimedByUserId", "rewardCents", status, "createdAt", "claimedAt", "claimCode" FROM freeboard_drops ORDER BY id DESC LIMIT 10'
  );

  console.log(JSON.stringify({ askedId: id, rowCount: one.rowCount, row: one.rows[0] ?? null, last10: last.rows }, null, 2));
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });