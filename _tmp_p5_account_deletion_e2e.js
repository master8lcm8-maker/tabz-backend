require("dotenv/config");
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { NestFactory } = require("@nestjs/core");

function findFirst(startDir, filename) {
  const stack = [startDir];
  while (stack.length) {
    const dir = stack.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile() && e.name === filename) return p;
    }
  }
  return null;
}

(async () => {
  const distDir = path.resolve(__dirname, "dist");
  if (!fs.existsSync(distDir)) throw new Error("DIST_MISSING: run npm run build first");

  const appModulePath = findFirst(distDir, "app.module.js");
  if (!appModulePath) throw new Error("APP_MODULE_NOT_FOUND under dist/");

  const svcPath = findFirst(distDir, "account-deletion.service.js");
  if (!svcPath) throw new Error("ACCOUNT_DELETION_SERVICE_NOT_FOUND under dist/");

  const { AppModule } = require(appModulePath);
  const { AccountDeletionService } = require(svcPath);

  // 1) Pick a live (not-yet-deleted) user from DO Postgres
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }});
  await pg.connect();

  const pick = await pg.query(`select id, email, "displayName", "deletedAt" from "users" where "deletedAt" is null order by id desc limit 1`);
  if (!pick.rowCount) throw new Error("NO_LIVE_USER_FOUND (all users already deleted)");
  const user = pick.rows[0];

  // 2) Boot Nest app context (no server) and run the REAL service methods
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const svc = app.get(AccountDeletionService);

  const req = await svc.requestDeletion(Number(user.id), "P5_PROOF_REQUEST", "127.0.0.1", "P5_PROOF");
  const token = req?.confirmToken;
  if (!token) throw new Error("NO_TOKEN_RETURNED");

  await svc.confirmDeletion(Number(user.id), String(token), "P5_PROOF_CONFIRM");

  // 3) Read back full PII fields after confirm (this is the proof)
  const after = await pg.query(
    `select id, email, "displayName", "passwordHash", "isActive", "deletedAt", "anonymizedAt", "deletionReason"
     from "users" where id=$1`,
    [Number(user.id)]
  );

  const reqRow = await pg.query(
    `select id, "userId", status, "requestToken", "requestedAt", "confirmedAt"
     from account_deletion_requests where "requestToken"=$1`,
    [String(token)]
  );

  console.log("P5_PROOF_DIST_APP_MODULE", appModulePath);
  console.log("P5_PROOF_DIST_SVC", svcPath);
  console.log("P5_PROOF_USER_PICKED", user);
  console.log("P5_PROOF_TOKEN", token);
  console.log("P5_PROOF_USER_AFTER", after.rows[0] || null);
  console.log("P5_PROOF_REQ_ROW", reqRow.rows[0] || null);

  await app.close();
  await pg.end();
})().catch(e => { console.error("P5_PROOF_FAIL", e && (e.stack || e.message) || e); process.exit(1); });