require("dotenv/config");
const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized:false } });
  await c.connect();
  try {
    const r = await c.query("select encode(gen_random_bytes(4),'hex') as ok;");
    console.log("PGCRYPTO_OK", r.rows[0]);
  } catch (e) {
    console.log("PGCRYPTO_MISSING", e.message);
    process.exitCode = 2;
  } finally {
    await c.end();
  }
})();