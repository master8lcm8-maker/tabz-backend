const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

function pickDb() {
  const candidates = ["tabz-dev.sqlite", "tabz.sqlite"]
    .map(f => path.join(process.cwd(), f))
    .filter(p => fs.existsSync(p));

  if (!candidates.length) {
    throw new Error("No sqlite db found in cwd. Expected tabz-dev.sqlite or tabz.sqlite");
  }

  // Prefer dev db if present
  const chosen = candidates.find(p => p.endsWith("tabz-dev.sqlite")) || candidates[0];
  return chosen;
}

const dbPath = pickDb();
console.log("DB:", dbPath);

const db = new Database(dbPath, { readonly: true });

// 1) Show last 30 wallet_transaction rows for walletId=5
const rows = db.prepare(`
  SELECT id, walletId, type, amountCents, metadata, createdAt
  FROM wallet_transaction
  WHERE walletId = ?
  ORDER BY id DESC
  LIMIT 30
`).all(5);

console.log("\nLAST 30 wallet_transaction rows for walletId=5:");
console.log(rows);

// 2) Show any cancel-refund rows (reason marker)
let cancelRows = [];
try {
  cancelRows = db.prepare(`
    SELECT id, walletId, type, amountCents, metadata, createdAt
    FROM wallet_transaction
    WHERE walletId = ?
      AND json_extract(metadata, '$.reason') = 'cashout_cancel_refund'
    ORDER BY id DESC
    LIMIT 30
  `).all(5);
} catch (e) {
  console.log("\nNOTE: json_extract failed (maybe metadata isn't valid JSON or SQLite JSON1 not enabled).");
  console.log("Error:", e.message);
}

console.log("\nCANCEL-REFUND marker rows (walletId=5, reason=cashout_cancel_refund):");
console.log(cancelRows);

// 3) Fallback search if json_extract isn't available: simple LIKE
const likeRows = db.prepare(`
  SELECT id, walletId, type, amountCents, metadata, createdAt
  FROM wallet_transaction
  WHERE walletId = ?
    AND metadata LIKE '%cashout_cancel_refund%'
  ORDER BY id DESC
  LIMIT 30
`).all(5);

console.log("\nCANCEL-REFUND fallback rows (metadata LIKE '%cashout_cancel_refund%'):");
console.log(likeRows);
