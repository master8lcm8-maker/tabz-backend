const { Client } = require("pg");
(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const r = await c.query(
    "select table_schema, table_name from information_schema.tables where table_name='migrations' order by table_schema"
  );
  console.log(r.rows);
  await c.end();
})().catch(e => { console.error(e?.message || e); process.exit(1); });