require("dotenv").config();
const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query("update public.migrations set name = $1 where id = 10", ["AddWalletIdToCashoutRequests0000000003046"]);
  await c.query("update public.migrations set name = $1 where id = 11", ["AddFailureReasonAndRetryOfCashoutIdToCashoutRequests0000000003047"]);
  const r = await c.query("select id, timestamp, name from public.migrations where id in (10,11) order by id;");
  console.log("UPDATED_ROWS", r.rows);
  await c.end();
})().catch(e => { console.error("UPDATE_FAIL", e.message); process.exit(1); });