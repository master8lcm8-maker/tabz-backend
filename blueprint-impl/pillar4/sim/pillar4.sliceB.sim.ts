import { run } from "../../runtime-harness/core/runner";
import { ok } from "../../runtime-harness/core/result";
import { nowIso } from "../../runtime-harness/core/clock";
import { newTrace } from "../../runtime-harness/core/trace";

import { evaluateBindingDecision } from "../runtime/binding/binding.engine";
import { evaluateAttributionDecision } from "../runtime/attribution/attribution.engine";
import { evaluateRewardEligibility } from "../runtime/rewards/reward-eligibility.engine";

export async function pillar4SliceBSim() {
  const trace = newTrace("pillar4-sliceB");

  const invitedUserId = "buyer-demo";
  const inviterUserId = "inviter-demo";
  const code = "CODE-DEMO";

  const attribution = evaluateAttributionDecision({ code, invitedUserId });
  const binding = evaluateBindingDecision({ invitedUserId, inviterUserId });
  const reward = evaluateRewardEligibility({ invitedUserId, eventType: "FIRST_PURCHASE", fraudFlag: false });

  trace.step("attribution", attribution);
  trace.step("binding", binding);
  trace.step("reward", reward);

  return ok({ at: nowIso(), attribution, binding, reward, trace });
}

if (require.main === module) {
  run("pillar4.sliceB", pillar4SliceBSim);
}
