require("dotenv/config");
const ds = require("../dist/data-source").default;

(async () => {
  await ds.initialize();
  const r = await ds.query(`
    SELECT *
    FROM credits_ledger_entry
    ORDER BY "createdAt" DESC
    LIMIT 5
  `);
  console.log(JSON.stringify(r,null,2));
  await ds.destroy();
})();
