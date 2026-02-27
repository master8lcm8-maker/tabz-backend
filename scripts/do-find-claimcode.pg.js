require("dotenv/config");
const { Client } = require("pg");
(async () => {
  const claimCode = process.argv[2];
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const cols = await c.query(`
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE column_name = 'claimCode'
    ORDER BY table_schema, table_name
  `);
  const hits = [];
  for (const t of cols.rows) {
    const fq = `"${t.table_schema}"."${t.table_name}"`;
    try {
      const r = await c.query(
        `SELECT '${t.table_schema}.${t.table_name}' AS "where", id, "claimCode", "claimedByUserId", "rewardCents", status, "createdAt", "claimedAt"
         FROM ${fq}
         WHERE "claimCode" = $1
         LIMIT 5`,
        [claimCode]
      );
      for (const row of r.rows) hits.push(row);
    } catch {}
  }
  console.log(JSON.stringify({ claimCode, candidateTables: cols.rows, hits }, null, 2));
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });