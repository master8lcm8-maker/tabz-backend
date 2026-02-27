require("reflect-metadata");

const mod=require("./dist/data-source");
const ds =
  mod.AppDataSource ||
  mod.dataSource ||
  mod.default ||
  Object.values(mod).find(v => v && typeof v === "object" && typeof v.initialize === "function");

if(!ds){ console.error("NO_DATASOURCE_EXPORT"); process.exit(1); }

(async () => {
  // IMPORTANT: do not assume anything — print what DS thinks before/after init.
  console.log("DS_OPTIONS", {
    type: ds.options.type,
    migrationsTableName: ds.options.migrationsTableName,
    migrationsRun: ds.options.migrationsRun,
    migrations: ds.options.migrations,
  });

  await ds.initialize();

  const ctx = await ds.query("select current_user, current_database() db, current_schema() schema, current_setting('search_path') sp");
  console.log("DB_CTX", ctx);

  // What migration table exists?
  const migTables = await ds.query(`
    select table_schema, table_name
    from information_schema.tables
    where table_name='migrations'
    order by table_schema
  `);
  console.log("MIGRATIONS_TABLES", migTables);

  // What does TypeORM say it loaded?
  const loaded = (ds.migrations || []).map(m => m && (m.name || m.constructor?.name)).filter(Boolean);
  console.log("MIGRATIONS_LOADED_COUNT", loaded.length);
  console.log("MIGRATIONS_LOADED_NAMES", loaded);

  // Does TypeORM think anything is pending?
  const pending = await ds.showMigrations();
  console.log("TYPEORM_PENDING", pending);

  await ds.destroy();
})().catch(async (e)=>{
  console.error("FAIL", e?.message || e);
  try { await ds.destroy(); } catch {}
  process.exit(1);
});