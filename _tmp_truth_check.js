const { Client } = require("pg");

(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const ctx = await c.query("select current_database() db, current_user usr, current_schema() schema, current_setting('search_path') sp");
  console.log("DB_CTX", ctx.rows);

  const migs = await c.query(`
    select id, timestamp, name
    from public.migrations
    order by id desc
    limit 25
  `);
  console.log("PUBLIC_MIGRATIONS_LAST25", migs.rows);

  const usersRole = await c.query(`
    select column_name, data_type, is_nullable, column_default
    from information_schema.columns
    where table_schema='public' and table_name='users' and column_name='role'
  `);
  console.log("COL_public.users.role", usersRole.rows);

  const destLast4 = await c.query(`
    select column_name, data_type, is_nullable, character_maximum_length
    from information_schema.columns
    where table_schema='public' and table_name='cashout_requests' and column_name='destinationLast4'
  `);
  console.log("COL_public.cashout_requests.destinationLast4", destLast4.rows);

  await c.end();
})().catch(e => { console.error(e?.message || e); process.exit(1); });