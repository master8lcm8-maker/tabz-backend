const { DataSource } = require("typeorm");

(async () => {
  const ds = new DataSource({
    type: "sqlite",
    database: "tabz-dev.sqlite",
    entities: [],
    synchronize: false,
    logging: false,
  });

  await ds.initialize();

  const rows = await ds.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%wallet%'"
  );

  console.log(rows);

  await ds.destroy();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
