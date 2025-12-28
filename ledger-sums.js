const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("tabz-dev.sqlite");

const walletId = 5;

db.all(
  `SELECT
     COALESCE(SUM(CASE WHEN type IN ('deposit','transfer_in','transfer_out') THEN amountCents ELSE 0 END),0) AS ledgerBalance,
     COALESCE(SUM(CASE WHEN type IN ('transfer_in','transfer_out') THEN amountCents ELSE 0 END),0) AS ledgerSpendable,
     COALESCE(SUM(CASE WHEN type IN ('deposit','cashout') THEN amountCents ELSE 0 END),0) AS ledgerCashoutAvailable
   FROM wallet_transactions
   WHERE walletId = ${walletId};`,
  (err, rows) => {
    if (err) throw err;
    console.log(rows);
    db.close();
  }
);
