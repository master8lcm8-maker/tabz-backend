require("reflect-metadata");
const { DataSource } = require("typeorm");

const mod = require("./dist/data-source");
const ds0 =
  mod.AppDataSource ||
  mod.dataSource ||
  mod.default ||
  Object.values(mod).find(v => v && typeof v === "object" && v.options && typeof v.initialize === "function");

if (!ds0) { console.error("Could not locate DataSource export in ./dist/data-source"); process.exit(1); }

const opts = { ...(ds0.options || {}) };
opts.migrationsRun = false;
opts.migrations = [];
opts.synchronize = false;

const ds = new DataSource(opts);

(async () => {
  await ds.initialize();

  const ctx = await ds.query("select current_database() as db, current_user as usr, current_schema() as schema, current_setting('search_path') as search_path");
  console.log("DB_CTX", ctx);

  const counts = await ds.query(`
    select table_schema, count(*)::int as table_count
    from information_schema.tables
    where table_type='BASE TABLE' and table_schema in ('public','tabz')
    group by table_schema
    order by table_schema
  `);
  console.log("TABLE_COUNTS", counts);

  const tables = await ds.query(`
    select table_schema, table_name
    from information_schema.tables
    where table_type='BASE TABLE' and table_schema in ('public','tabz')
    order by table_schema, table_name
  `);
  console.log("TABLE_LIST", tables);

  const migRows = await ds.query(`
    select table_schema,
           (select count(*)::int from information_schema.columns c where c.table_schema=t.table_schema and c.table_name='migrations') as migrations_columns
    from (select distinct table_schema from information_schema.tables where table_schema in ('public','tabz') and table_name='migrations') t
    order by table_schema
  `);
  console.log("MIGRATIONS_TABLES_PRESENT", migRows);

  await ds.destroy();
})().catch(async (e) => {
  console.error(e?.message || e);
  try { await ds.destroy(); } catch {}
  process.exit(1);
});