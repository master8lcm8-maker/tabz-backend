const { Client } = require("pg");

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const schemas = await c.query(`
    select nspname as schema
    from pg_namespace
    where nspname in ('public','tabz')
    order by nspname
  `);
  console.log("SCHEMAS", schemas.rows);

  const tabzTables = await c.query(`
    select table_schema, table_name
    from information_schema.tables
    where table_schema='tabz'
    order by table_name
  `);
  console.log("TABZ_TABLES", tabzTables.rows);

  const migs = await c.query(`
    select table_schema, table_name
    from information_schema.tables
    where table_name='migrations'
    order by table_schema
  `);
  console.log("MIGRATIONS_TABLES", migs.rows);

  await c.end();
})().catch(e => { console.error(e?.message || e); process.exit(1); });