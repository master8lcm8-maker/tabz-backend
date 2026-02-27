const fs = require("fs");
const path = require("path");

const claimCode = process.argv[2];
if(!claimCode) { console.error("missing claimCode"); process.exit(1); }

const dbPath = path.resolve(process.cwd(), "tabz-dev.sqlite");
if(!fs.existsSync(dbPath)) { console.error("missing sqlite file:", dbPath); process.exit(1); }

function done(out){ console.log(JSON.stringify(out, null, 2)); }

(async () => {
  // Try better-sqlite3 first (sync)
  try {
    const Database = require("better-sqlite3");
    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare('SELECT id, "claimCode", "claimedByUserId", "rewardCents", status, "createdAt", "claimedAt" FROM freeboard_drops WHERE "claimCode" = ? LIMIT 1').get(claimCode);
    const last10 = db.prepare('SELECT id, "claimCode", "claimedByUserId", "rewardCents", status, "createdAt", "claimedAt" FROM freeboard_drops ORDER BY id DESC LIMIT 10').all();
    db.close();
    return done({ driver: "better-sqlite3", claimCode, found: !!row, row: row || null, last10 });
  } catch (e) {}

  // Fallback to sqlite3 (async)
  try {
    const sqlite3 = require("sqlite3");
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
    const get = (sql, params=[]) => new Promise((res, rej) => db.get(sql, params, (err,row)=> err?rej(err):res(row)));
    const all = (sql, params=[]) => new Promise((res, rej) => db.all(sql, params, (err,rows)=> err?rej(err):res(rows)));

    const row = await get('SELECT id, "claimCode", "claimedByUserId", "rewardCents", status, "createdAt", "claimedAt" FROM freeboard_drops WHERE "claimCode" = ? LIMIT 1', [claimCode]);
    const last10 = await all('SELECT id, "claimCode", "claimedByUserId", "rewardCents", status, "createdAt", "claimedAt" FROM freeboard_drops ORDER BY id DESC LIMIT 10');
    db.close();
    return done({ driver: "sqlite3", claimCode, found: !!row, row: row || null, last10 });
  } catch (e) {
    console.error("No usable sqlite driver found (need better-sqlite3 or sqlite3). Error:", e?.message || e);
    process.exit(1);
  }
})();