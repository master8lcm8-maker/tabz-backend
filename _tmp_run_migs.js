require("reflect-metadata");

const mod = require("./dist/data-source");
const ds =
  mod.AppDataSource ||
  mod.dataSource ||
  mod.default ||
  Object.values(mod).find(
    (v) => v && typeof v === "object" && typeof v.initialize === "function" && typeof v.runMigrations === "function"
  );

if (!ds) {
  console.error("Could not locate DataSource export in ./dist/data-source");
  process.exit(1);
}

ds.initialize()
  .then(() => ds.query("select current_user, current_schema(), current_setting('search_path') as sp"))
  .then((r) => { console.log("DB_CTX", r); })
  .then(() => ds.runMigrations({ transaction: "all" }))
  .then((r) => { console.log("MIGRATIONS_RAN", Array.isArray(r) ? r.map((x) => x.name) : r); })
  .then(() => ds.destroy())
  .catch((e) => { console.error(e?.message || e); process.exit(1); });