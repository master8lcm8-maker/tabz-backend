import { run } from "../../runtime-harness/core/runner";
import { ok } from "../../runtime-harness/core/result";
import { nowIso } from "../../runtime-harness/core/clock";
import { newTrace } from "../../runtime-harness/core/trace";

import { evaluateClaimDecision } from "../runtime/decisions/claim-decision.engine";
import { evaluateAbuseDecision } from "../runtime/abuse/abuse-decision.engine";

export async function pillar3SliceBSim() {
  const trace = newTrace("pillar3-sliceB");

  const ctx = {
    requestId: "SIM-" + nowIso(),
    actorId: "buyer-demo",
    venueId: "venue-demo",
    itemId: "item-demo",
  };

  const claim = evaluateClaimDecision(ctx);
  const abuse = evaluateAbuseDecision(ctx);

  trace.step("claim", claim);
  trace.step("abuse", abuse);

  return ok({ at: nowIso(), claim, abuse, trace });
}

if (require.main === module) {
  run("pillar3.sliceB", pillar3SliceBSim);
}
