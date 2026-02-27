require("reflect-metadata");

const mod = require("./dist/data-source");
const ds =
  mod.AppDataSource ||
  mod.dataSource ||
  mod.default ||
  Object.values(mod).find(
    (v) => v && typeof v === "object" && typeof v.initialize === "function" && typeof v.query === "function"
  );

if (!ds) {
  console.error("Could not locate DataSource export in ./dist/data-source");
  process.exit(1);
}

(async () => {
  await ds.initialize();

  const ctx = await ds.query("select current_database() as db, current_user as usr, current_schema() as schema, current_setting('search_path') as search_path");
  console.log("DB_CTX", ctx);

  const usersExact = await ds.query(`
    select table_schema, table_name
    from information_schema.tables
    where table_type='BASE TABLE' and table_name='users'
    order by table_schema, table_name
  `);
  console.log("USERS_TABLES", usersExact);

  const userLike = await ds.query(`
    select table_schema, table_name
    from information_schema.tables
    where table_type='BASE TABLE'
      and (table_name ilike '%user%' or table_name ilike '%identity%')
    order by table_schema, table_name
    limit 200
  `);
  console.log("USERLIKE_TABLES", userLike);

  const migs = await ds.query(`
    select table_schema, table_name
    from information_schema.tables
    where table_type='BASE TABLE' and table_name in ('migrations','typeorm_metadata')
    order by table_schema, table_name
  `);
  console.log("MIGRATION_META_TABLES", migs);

  await ds.destroy();
})().catch(async (e) => {
  console.error(e?.message || e);
  try { await ds.destroy(); } catch {}
  process.exit(1);
});