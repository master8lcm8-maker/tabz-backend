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

  const row = await ds.query(
    "SELECT * FROM wallets WHERE userId = 3"
  );

  console.log(row);

  await ds.destroy();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
