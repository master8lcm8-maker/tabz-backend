require("dotenv").config();
const { Client } = require("pg");
(async () => {
  const base = process.env.DATABASE_URL || "";
  if (!base) throw new Error("DATABASE_URL missing");
  const sep = base.includes("?") ? "&" : "?";
  const url = base + sep + "options=-c%20search_path%3Dtabz%2Cpublic";
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query("select current_user, current_database(), current_schema(), current_setting('search_path') as search_path");
  console.log(r.rows);
  await c.end();
})().catch(e => { console.error(e?.message || e); process.exit(1); });