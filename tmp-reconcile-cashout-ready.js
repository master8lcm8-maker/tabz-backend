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

  const userId = 3;

  const walletRow = await ds.query("SELECT id, userId, cashoutAvailableCents FROM wallets WHERE userId = ?", [userId]);
  if (!walletRow?.length) throw new Error("Wallet not found for userId=3");
  const walletId = walletRow[0].id;

  // credits that fund cashout-ready balance
  const creditTypes = ["DEV_ADD_CASHOUT", "dev_cashout_topup", "payout_credit", "PAYOUT_ORDER"];
  const credits = await ds.query(
    `SELECT COALESCE(SUM(amountCents),0) AS sumCents
     FROM wallet_transactions
     WHERE walletId = ? AND type IN (${creditTypes.map(()=>"?").join(",")})`,
    [walletId, ...creditTypes]
  );

  // subtract only COMPLETED cashouts (FAILED should not reduce availability)
  const completed = await ds.query(
    `SELECT COALESCE(SUM(amountCents),0) AS sumCents
     FROM cashout_requests
     WHERE walletId = ? AND status = 'COMPLETED'`,
    [walletId]
  );

  const cashoutAvailable = Math.max(0, Number(credits[0].sumCents) - Number(completed[0].sumCents));

  await ds.query(
    "UPDATE wallets SET cashoutAvailableCents = ?, updatedAt = datetime('now') WHERE userId = ?",
    [cashoutAvailable, userId]
  );

  const verify = await ds.query("SELECT id,userId,balanceCents,spendableBalanceCents,cashoutAvailableCents,updatedAt FROM wallets WHERE userId = ?", [userId]);

  console.log("SET cashoutAvailableCents TO:", cashoutAvailable);
  console.log("VERIFY:", verify);

  await ds.destroy();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
