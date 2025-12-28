const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("tabz-dev.sqlite");
const walletId = 5;

db.all(
  "SELECT id, type, amountCents, createdAt, metadata FROM wallet_transactions WHERE walletId = ? ORDER BY id ASC",
  [walletId],
  (err, rows) => {
    if (err) throw err;
    console.log(rows);
    db.close();
  }
);
