require("dotenv/config");
const ds = require("../dist/data-source").default;

(async () => {
  await ds.initialize();

  const r = await ds.query(`
    SELECT id, "walletId", type, "amountCents", metadata, "createdAt"
    FROM wallet_transactions
    WHERE "createdAt" >= '2026-02-24T00:00:00.000Z'
    ORDER BY "createdAt" DESC
    LIMIT 50
  `);

  console.log(JSON.stringify(r,null,2));
  await ds.destroy();
})().catch(e => { console.error(e); process.exit(1); });
