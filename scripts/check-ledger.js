require("dotenv/config");
const ds = require("../dist/data-source").default;

(async () => {
  await ds.initialize();
  const r = await ds.query(`
    SELECT to_regclass('public.credits_ledger') AS ledger_tbl
  `);
  console.log(JSON.stringify(r,null,2));
  await ds.destroy();
})();
