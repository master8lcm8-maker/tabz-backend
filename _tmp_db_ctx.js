require("dotenv").config();
const { Client } = require("pg");

function sanitize(url){
  return String(url||"").replace(/\/\/([^:\/?#]+):([^@\/?#]+)@/,(m,u)=>`//${u}:***@`);
}

(async () => {
  console.log("DATABASE_URL(SANITIZED)=", sanitize(process.env.DATABASE_URL));

  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await c.connect();
  const r = await c.query("select current_user as current_user, inet_server_addr() as server_addr, inet_server_port() as server_port, current_database() as db, current_schema() as schema;");
  console.log("DB_CTX", r.rows[0]);
  await c.end();
})().catch(e => { console.error("CONNECT_FAIL", e.message); process.exit(1); });