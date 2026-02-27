require("dotenv/config");
const { Client } = require("pg");
(async () => {
  const claimCode = process.argv[2];
  if (!claimCode) throw new Error("missing claimCode arg");
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(
    'SELECT id, "claimCode", "claimedByUserId", "rewardCents", status, "createdAt", "claimedAt", "expiresAt" FROM freeboard_drops WHERE "claimCode" = $1',
    [claimCode]
  );
  console.log("DO_ROWCOUNT=", r.rowCount);
  console.log("DO_ROW=", r.rows[0] || null);
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });