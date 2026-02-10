import { createDrop } from "../services/drop.service";
import { attemptClaim } from "../services/claim.service";

function main() {
  const drop = createDrop({
    venueId: "v1",
    createdByUserId: "owner1",
    title: "Free Drink",
    qtyTotal: 1,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    cooldownSeconds: 30,
  });

  let stock = drop.qtyRemaining;

  const res1 = attemptClaim(
    {
      loadDrop: () => ({ ...drop, qtyRemaining: stock }),
      decrementStockAtomic: () => {
        if (stock <= 0) return false;
        stock -= 1;
        return true;
      },
      saveClaimOk: () => "claim1",
      abuseInputs: () => ({ attemptsLastMinute: 0, suspectedFarmPattern: false }),
    },
    { dropId: drop.dropId, userId: "u1", venueId: drop.venueId, at: new Date().toISOString() }
  );

  console.log({ res1, stock });
}

main();
