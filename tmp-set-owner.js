const { DataSource } = require("typeorm");

const ds = new DataSource({
  type: "sqlite",
  database: "tabz-dev.sqlite",
  entities: [],
  synchronize: false,
  logging: false,
});

(async () => {
  await ds.initialize();

  const before = await ds.query("SELECT id,email,role FROM users WHERE id=3");
  console.log("BEFORE:", before);

  const upd = await ds.query("UPDATE users SET role='venueOwner' WHERE id=3");
  console.log("UPDATED:", upd);

  const after = await ds.query("SELECT id,email,role FROM users WHERE id=3");
  console.log("AFTER:", after);

  await ds.destroy();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
