require("dotenv/config");
const { Client } = require("pg");
(async () => {
  const userId = Number(process.argv[2]||0);
  if(!userId) throw new Error("missing userId");
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized:false }});
  await c.connect();
  const r = await c.query('select id, email, "displayName", "deletedAt", "anonymizedAt" from "users" where id=$1', [userId]);
  console.log("USER_PII_CHECK", r.rows[0]||null);
  await c.end();
})().catch(e=>{ console.error("FAIL", e.message); process.exit(1); });