const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("tabz-dev.sqlite");

const walletId = 5;

db.all(
  `SELECT
     status,
     COUNT(*) as count,
     COALESCE(SUM(amountCents),0) as sumAmountCents
   FROM cashout_requests
   WHERE walletId = ?
   GROUP BY status
   ORDER BY status;`,
  [walletId],
  (err, rows) => {
    if (err) throw err;
    console.log(rows);
    db.close();
  }
);
