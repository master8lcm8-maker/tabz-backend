require("dotenv/config");
const ds = require("../dist/data-source").default;

(async () => {
  await ds.initialize();
  const r = await ds.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema='public'
    ORDER BY table_name
  `);
  console.log(JSON.stringify(r,null,2));
  await ds.destroy();
})();
