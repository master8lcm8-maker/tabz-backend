require("dotenv/config");
const ds = require("../dist/data-source").default;

(async () => {
  await ds.initialize();
  const r = await ds.query(`
    SELECT id, "creatorId", "claimedByUserId", status, "rewardCents", "claimCode", "createdAt", "claimedAt", "expiresAt"
    FROM freeboard_drops
    WHERE id = 5
  `);
  console.log(JSON.stringify(r,null,2));
  await ds.destroy();
})().catch(e => { console.error(e); process.exit(1); });
