require("dotenv").config();
const { Client } = require("pg");

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const q = async (sql, params) => (await c.query(sql, params)).rows;

  console.log(await q("select current_user, current_database(), has_database_privilege(current_user, current_database(), 'CREATE') as db_create"));

  // Try create our own schema (should NOT require CREATE on public)
  try {
    await c.query("create schema if not exists tabz authorization " + (await q("select current_user"))[0].current_user);
    console.log([{ schema_create_ok: true }]);
  } catch (e) {
    console.log([{ schema_create_ok: false, error: String(e.message || e) }]);
  }

  // Try create a table inside that schema
  try {
    await c.query("create table if not exists tabz.__priv_test(id int)");
    console.log([{ table_create_ok: true }]);
    await c.query("drop table if exists tabz.__priv_test");
  } catch (e) {
    console.log([{ table_create_ok: false, error: String(e.message || e) }]);
  }

  await c.end();
})().catch(e => { console.error(e?.message || e); process.exit(1); });