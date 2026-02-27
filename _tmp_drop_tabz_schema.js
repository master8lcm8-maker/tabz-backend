const { Client } = require("pg");

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  await c.query("drop schema if exists tabz cascade");
  console.log("DROPPED_SCHEMA_tabz");

  const schemas = await c.query(`
    select nspname as schema
    from pg_namespace
    where nspname in ('public','tabz')
    order by nspname
  `);
  console.log("SCHEMAS_AFTER", schemas.rows);

  await c.end();
})().catch(e => { console.error(e?.message || e); process.exit(1); });