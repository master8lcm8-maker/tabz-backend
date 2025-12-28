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

  const walletId = 3;

  const txSummary = await ds.query(`
    SELECT
      type,
      COUNT(*) AS cnt,
      COALESCE(SUM(amountCents), 0) AS sumCents
    FROM wallet_transactions
    WHERE walletId = ${walletId}
    GROUP BY type
    ORDER BY type
  `);

  const cashoutSummary = await ds.query(`
    SELECT
      status,
      COUNT(*) AS cnt,
      COALESCE(SUM(amountCents), 0) AS sumCents
    FROM cashout_requests
    WHERE walletId = ${walletId}
    GROUP BY status
    ORDER BY status
  `);

  console.log("TX SUMMARY:", txSummary);
  console.log("CASHOUT SUMMARY:", cashoutSummary);

  await ds.destroy();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
