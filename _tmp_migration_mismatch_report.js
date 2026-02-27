require("reflect-metadata");
require("dotenv").config();

const { Client } = require("pg");

const mod = require("./dist/data-source");
const ds =
  mod.AppDataSource ||
  mod.dataSource ||
  mod.default ||
  Object.values(mod).find(v => v && typeof v === "object" && typeof v.initialize === "function");

if (!ds) { console.error("NO_DATASOURCE_EXPORT"); process.exit(1); }

(async () => {
  // IMPORTANT: initialize so TypeORM loads migrations from globs
  await ds.initialize();

  const codeNames = (ds.migrations || [])
    .map(m => m && (m.name || m.constructor?.name))
    .filter(Boolean)
    .sort();

  await ds.destroy();

  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized:false }});
  await c.connect();
  const dbRows = await c.query("select name from public.migrations order by name");
  await c.end();
  const dbNames = dbRows.rows.map(r => r.name).filter(Boolean).sort();

  const setCode = new Set(codeNames);
  const setDb = new Set(dbNames);

  const inDbNotInCode = dbNames.filter(n => !setCode.has(n));
  const inCodeNotInDb = codeNames.filter(n => !setDb.has(n));

  console.log("CODE_MIGRATIONS_COUNT", codeNames.length);
  console.log("DB_MIGRATIONS_COUNT", dbNames.length);

  console.log("IN_DB_NOT_IN_CODE_COUNT", inDbNotInCode.length);
  console.log("IN_DB_NOT_IN_CODE", inDbNotInCode);

  console.log("IN_CODE_NOT_IN_DB_COUNT", inCodeNotInDb.length);
  console.log("IN_CODE_NOT_IN_DB", inCodeNotInDb);
})().catch(e => { console.error("FAIL", e?.message || e); process.exit(1); });