require("dotenv").config();
const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const r = await c.query("select id, timestamp, name from public.migrations order by id;");
  console.log("DB_MIGRATIONS_COUNT", r.rows.length);
  console.log("DB_MIGRATIONS_NAMES", r.rows.map(x=>x.name));

  await c.end();
})().catch(e => { console.error("QUERY_FAIL", e.message); process.exit(1); });