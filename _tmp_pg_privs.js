require("dotenv").config();
const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const q = async (sql, params) => (await c.query(sql, params)).rows;

  console.log(await q("select current_user, current_database(), current_schema(), current_setting('search_path') as search_path"));
  console.log(await q("select has_schema_privilege(current_user,'public','USAGE') as public_usage, has_schema_privilege(current_user,'public','CREATE') as public_create"));

  await c.end();
})().catch(e => { console.error(e?.message || e); process.exit(1); });