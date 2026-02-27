require("dotenv/config");
const { Client } = require("pg");

(async () => {
  const token = process.argv[2];
  const userId = Number(process.argv[3] || 0);
  if (!token) throw new Error("missing token arg");
  if (!userId) throw new Error("missing userId arg");

  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const u = await c.query('SELECT id, "deletedAt", "anonymizedAt", "deletionReason" FROM "users" WHERE id = $1', [userId]);
  const r = await c.query('SELECT id, "userId", status, "requestedAt", "confirmedAt" FROM account_deletion_requests WHERE "requestToken" = $1', [token]);

  console.log("DO_USER_ROWCOUNT=", u.rowCount);
  console.log("DO_USER_ROW=", u.rows[0] || null);
  console.log("DO_REQ_ROWCOUNT=", r.rowCount);
  console.log("DO_REQ_ROW=", r.rows[0] || null);

  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
