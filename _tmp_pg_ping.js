const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query("select current_user usr, current_database() db, current_schema() schema, current_setting('search_path') sp");
  console.log("PG_PING_OK", r.rows);
  await c.end();
})().catch(e => { console.error("PG_PING_FAIL", e?.message || e); process.exit(1); });