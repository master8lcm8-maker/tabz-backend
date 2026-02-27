require("reflect-metadata");

const mod=require("./dist/data-source");
const ds =
  mod.AppDataSource ||
  mod.dataSource ||
  mod.default ||
  Object.values(mod).find(v => v && typeof v === "object" && typeof v.initialize === "function");

if(!ds){ console.error("NO_DATASOURCE_EXPORT"); process.exit(1); }

(async () => {
  await ds.initialize();

  const ctx = await ds.query("select current_user, current_schema(), current_setting('search_path') as sp");
  console.log("DB_CTX", ctx);

  const migTables = await ds.query(`
    select table_schema, table_name
    from information_schema.tables
    where table_name='migrations'
    order by table_schema
  `);
  console.log("MIGRATIONS_TABLES", migTables);

  const last10 = await ds.query(`
    select id, timestamp, name
    from public.migrations
    order by id desc
    limit 10
  `);
  console.log("PUBLIC_MIGRATIONS_LAST10", last10);

  const pending = await ds.showMigrations();
  console.log("TYPEORM_PENDING_MIGRATIONS", pending);

  await ds.destroy();
})().catch(async (e)=>{
  console.error(e?.message || e);
  try { await ds.destroy(); } catch {}
  process.exit(1);
});