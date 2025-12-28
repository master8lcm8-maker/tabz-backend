const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("tabz-dev.sqlite");

const walletId = 5;

db.all(
  `SELECT id, status, amountCents, failureReason, createdAt
   FROM cashout_requests
   WHERE walletId = ? AND status = 'FAILED'
   ORDER BY id ASC;`,
  [walletId],
  (err, rows) => {
    if (err) throw err;
    console.log(rows);
    db.close();
  }
);
