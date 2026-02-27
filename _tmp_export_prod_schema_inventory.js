const { Client } = require("pg");

(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const ctx = await c.query(`
    select
      current_database() as db,
      current_user as usr,
      current_schema() as schema,
      current_setting('search_path') as search_path,
      version() as version
  `);

  const tables = await c.query(`
    select table_schema, table_name
    from information_schema.tables
    where table_type='BASE TABLE'
      and table_schema not in ('pg_catalog','information_schema')
    order by table_schema, table_name
  `);

  const columns = await c.query(`
    select
      table_schema, table_name, column_name,
      data_type, udt_name,
      is_nullable, column_default,
      character_maximum_length,
      numeric_precision, numeric_scale,
      datetime_precision
    from information_schema.columns
    where table_schema not in ('pg_catalog','information_schema')
    order by table_schema, table_name, ordinal_position
  `);

  const constraints = await c.query(`
    select
      tc.table_schema, tc.table_name,
      tc.constraint_name, tc.constraint_type,
      kcu.column_name,
      ccu.table_schema as foreign_table_schema,
      ccu.table_name as foreign_table_name,
      ccu.column_name as foreign_column_name
    from information_schema.table_constraints tc
    left join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
     and tc.table_name = kcu.table_name
    left join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
     and ccu.table_schema = tc.table_schema
    where tc.table_schema not in ('pg_catalog','information_schema')
    order by tc.table_schema, tc.table_name, tc.constraint_name, kcu.ordinal_position
  `);

  const indexes = await c.query(`
    select schemaname as table_schema, tablename as table_name, indexname, indexdef
    from pg_indexes
    where schemaname not in ('pg_catalog','information_schema')
    order by schemaname, tablename, indexname
  `);

  const enums = await c.query(`
    select
      n.nspname as enum_schema,
      t.typname as enum_name,
      e.enumlabel as enum_value,
      e.enumsortorder as sort_order
    from pg_type t
    join pg_enum e on t.oid = e.enumtypid
    join pg_catalog.pg_namespace n on n.oid = t.typnamespace
    where n.nspname not in ('pg_catalog','information_schema')
    order by enum_schema, enum_name, sort_order
  `);

  const out = {
    generatedAt: new Date().toISOString(),
    ctx: ctx.rows[0],
    tables: tables.rows,
    columns: columns.rows,
    constraints: constraints.rows,
    indexes: indexes.rows,
    enums: enums.rows,
  };

  const fs = require("fs");
  fs.writeFileSync("PROD_SCHEMA_INVENTORY.json", JSON.stringify(out, null, 2), "utf8");
  console.log("WROTE=PROD_SCHEMA_INVENTORY.json");
  await c.end();
})().catch(e => { console.error(e?.message || e); process.exit(1); });