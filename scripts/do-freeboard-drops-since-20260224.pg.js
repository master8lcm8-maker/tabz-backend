require("dotenv/config");
const { Client } = require("pg");

(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const since = "2026-02-24T00:00:00.000Z";

  // Check whether Freeboard drops exist / were claimed / have rewards since the anchor.
  // (table name guess: freeboard_drops; if it differs, the error will tell us the real name)
  const sql = `
    SELECT
      id,
      "venueId",
      "creatorId",
      "claimedByUserId",
      status,
      "rewardCents",
      "claimCode",
      "createdAt",
      "claimedAt",
      "expiresAt"
    FROM freeboard_drops
    WHERE "createdAt" >= $1
    ORDER BY "createdAt" DESC
    LIMIT 50
  `;

  const res = await c.query(sql, [since]);
  console.log(JSON.stringify(res.rows, null, 2));

  await c.end();
})().catch(e => { console.error(e); process.exit(1); });