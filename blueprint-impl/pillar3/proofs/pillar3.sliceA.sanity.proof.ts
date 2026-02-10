/**
 * Slice A — Pillar 3 sanity proof (no runtime wiring).
 * Executes deterministic checks for decision order + abuse precedence.
 */

import { ClaimDecisionService } from "../services/decisions/claim-decision.service";
import { P3ReasonCode } from "../policies/reason-codes";
import { AbuseDecisionService } from "../services/abuse/abuse-decision.service";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("PROOF_FAIL: " + msg);
}

export function runPillar3SliceASanityProof() {
  const now = "2026-02-09T00:00:00.000Z";
  const claim = new ClaimDecisionService();

  // 1) drop not found wins early
  const r1 = claim.decide({ dropId: 1, userId: 1, venueId: 1, nowIso: now, dropExists: false });
  assert(r1.ok === false && r1.reasonCode === P3ReasonCode.DROP_NOT_FOUND, "DROP_NOT_FOUND expected");

  // 2) expiry beats out-of-stock (order check)
  const r2 = claim.decide({ dropId: 1, userId: 1, venueId: 1, nowIso: now, dropExists: true, isExpired: true, hasStock: false });
  assert(r2.ok === false && r2.reasonCode === P3ReasonCode.DROP_EXPIRED, "DROP_EXPIRED precedence expected");

  // 3) concurrency conflict beats abuse (order check)
  const r3 = claim.decide({ dropId: 1, userId: 1, venueId: 1, nowIso: now, dropExists: true, concurrencyOk: false, abuseDecision: "BLOCK" });
  assert(r3.ok === false && r3.reasonCode === P3ReasonCode.CONCURRENCY_CONFLICT, "CONCURRENCY_CONFLICT precedence expected");

  // 4) abuse precedence: BLOCK > SUSPECT > ALLOW
  const abuse = new AbuseDecisionService();
  const a1 = abuse.decide({ userId: 1, venueId: 1, action: "CLAIM_ATTEMPT", nowIso: now, recentAttempts: 999 }, { anomalyScore: 0 });
  assert(a1 === "BLOCK", "rate limit should block");

  const a2 = abuse.decide({ userId: 1, venueId: 1, action: "CLAIM_ATTEMPT", nowIso: now, recentAttempts: 10 }, { anomalyScore: 60 });
  assert(a2 === "SUSPECT" || a2 === "BLOCK", "suspect expected (depending on thresholds)");

  return true;
}

// allow running directly (optional)
if (require.main === module) {
  runPillar3SliceASanityProof();
  // eslint-disable-next-line no-console
  console.log("P3 Slice A Sanity Proof: PASS");
}
