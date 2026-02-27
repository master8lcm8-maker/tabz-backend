require("dotenv/config");
const ds = require("../dist/data-source").default;

(async () => {
  await ds.initialize();

  const counts = await ds.query(`
    SELECT
      (SELECT COUNT(*)::int FROM credits_ledger_entry) AS ledger_count,
      (SELECT COUNT(*)::int FROM credits_transfer)     AS transfer_count,
      (SELECT COUNT(*)::int FROM credits_account)      AS account_count
  `);

  const lastTransfers = await ds.query(`
    SELECT *
    FROM credits_transfer
    ORDER BY "createdAt" DESC
    LIMIT 5
  `);

  const lastAccounts = await ds.query(`
    SELECT *
    FROM credits_account
    ORDER BY "updatedAt" DESC
    LIMIT 5
  `);

  console.log(JSON.stringify({ counts: counts[0], lastTransfers, lastAccounts }, null, 2));
  await ds.destroy();
})().catch(e => { console.error(e); process.exit(1); });
