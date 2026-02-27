require("dotenv/config");
const ds = require("../dist/data-source").default;

(async () => {
  await ds.initialize();
  const r = await ds.query(`
    SELECT *
    FROM wallet_transactions
    ORDER BY "createdAt" DESC
    LIMIT 10
  `);
  console.log(JSON.stringify(r,null,2));
  await ds.destroy();
})().catch(e => { console.error(e); process.exit(1); });
