require("dotenv/config");
const { Client } = require("pg");

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query('select id, "userId", status, "requestToken", "requestedAt" from account_deletion_requests order by id desc limit 5');
  console.log("DELETION_REQS_LAST5", r.rows);
  await c.end();
})().catch(e => { console.error("QUERY_FAIL", e.message); process.exit(1); });