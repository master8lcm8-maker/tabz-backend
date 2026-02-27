const fs = require("fs");
const path = require("path");
const claimCode = process.argv[2];
const dbPath = path.resolve(process.cwd(), "tabz-dev.sqlite");
if(!fs.existsSync(dbPath)) { console.log("SQLITE_MISSING"); process.exit(0); }
(async () => {
  const sqlite3 = require("sqlite3");
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
  const get = (sql, params=[]) => new Promise((res, rej) => db.get(sql, params, (err,row)=> err?rej(err):res(row)));
  const row = await get('SELECT id, "claimCode" FROM freeboard_drops WHERE "claimCode" = ? LIMIT 1', [claimCode]);
  db.close();
  console.log("SQLITE_FOUND=", !!row);
  console.log("SQLITE_ROW=", row || null);
})().catch(e => { console.error(e); process.exit(1); });