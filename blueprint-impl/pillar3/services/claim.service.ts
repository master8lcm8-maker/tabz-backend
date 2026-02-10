import { P3ClaimAttempt, P3ClaimResult, P3Drop, P3RejectionCode } from "../contracts/pillar3.contracts";
import { evaluateClaimRules, buildRuleContext } from "./claim-rules.service";
import { checkAbuse } from "./abuse.service";

export type ClaimDeps = {
  // supplied later
  loadDrop: (dropId: string) => P3Drop | null;
  saveClaimOk: (dropId: string, userId: string, venueId: string, at: string) => string; // returns claimId
  decrementStockAtomic: (dropId: string) => boolean; // returns success/failure
  abuseInputs: () => { attemptsLastMinute: number; suspectedFarmPattern: boolean };
};

export function attemptClaim(deps: ClaimDeps, attempt: P3ClaimAttempt): P3ClaimResult {
  const at = attempt.at;

  const abuse = checkAbuse(deps.abuseInputs());
  if (!abuse.ok) return { ok: false, dropId: attempt.dropId, userId: attempt.userId, venueId: attempt.venueId, at, reasonCode: abuse.reasonCode };

  const drop = deps.loadDrop(attempt.dropId);
  if (!drop) return { ok: false, dropId: attempt.dropId, userId: attempt.userId, venueId: attempt.venueId, at, reasonCode: P3RejectionCode.DROP_NOT_FOUND };

  if (drop.expiresAt && new Date(drop.expiresAt).getTime() <= Date.now()) {
    return { ok: false, dropId: drop.dropId, userId: attempt.userId, venueId: attempt.venueId, at, reasonCode: P3RejectionCode.DROP_EXPIRED };
  }

  const ctx = buildRuleContext(attempt);
  const rules = evaluateClaimRules(ctx);
  if (!rules.ok) return { ok: false, dropId: drop.dropId, userId: attempt.userId, venueId: attempt.venueId, at, reasonCode: rules.reasonCode };

  const stockOk = deps.decrementStockAtomic(drop.dropId);
  if (!stockOk) return { ok: false, dropId: drop.dropId, userId: attempt.userId, venueId: attempt.venueId, at, reasonCode: P3RejectionCode.CONCURRENCY_CONFLICT };

  const claimId = deps.saveClaimOk(drop.dropId, attempt.userId, attempt.venueId, at);
  return { ok: true, claimId, dropId: drop.dropId, userId: attempt.userId, venueId: attempt.venueId, at };
}
