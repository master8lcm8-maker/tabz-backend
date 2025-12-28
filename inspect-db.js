const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("tabz-dev.sqlite");

db.all(
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
  (err, rows) => {
    if (err) throw err;
    console.log(rows.map(r => r.name));
    db.close();
  }
);
