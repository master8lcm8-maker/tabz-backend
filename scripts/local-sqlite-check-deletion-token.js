const fs = require("fs");
const path = require("path");

(async () => {
  const token = process.argv[2];
  if (!token) throw new Error("missing token arg");
  const dbPath = path.resolve(process.cwd(), "tabz-dev.sqlite");
  if (!fs.existsSync(dbPath)) { console.log("SQLITE_FILE_NOT_PRESENT"); process.exit(0); }

  const sqlite3 = require("sqlite3");
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

  const get = (sql, params=[]) => new Promise((res, rej) =>
    db.get(sql, params, (err,row)=> err?rej(err):res(row))
  );

  let found = false;
  let row = null;

  try {
    row = await get('SELECT id, "requestToken" FROM account_deletion_requests WHERE "requestToken" = ? LIMIT 1', [token]);
    found = !!row;
  } catch (e) {
    // table may not exist locally; that's fine for negative proof
    console.log("SQLITE_QUERY_ERROR_OR_TABLE_MISSING=", String(e.message || e));
    db.close();
    process.exit(0);
  }

  db.close();
  console.log("SQLITE_FOUND=", found);
  console.log("SQLITE_ROW=", row || null);
})().catch(e => { console.error(e); process.exit(1); });
