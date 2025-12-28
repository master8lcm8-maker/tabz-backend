const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("tabz-dev.sqlite");

db.all(
  "SELECT id, userId, balanceCents, spendableBalanceCents, cashoutAvailableCents FROM wallets WHERE userId = 5",
  (err, rows) => {
    if (err) throw err;
    console.log(rows);
    db.close();
  }
);
