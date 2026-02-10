import { P3ClaimAttempt, P3RejectionCode } from "../contracts/pillar3.contracts";

export type RuleContext = {
  // supplied later by wiring; for now passed in
  userClaimsToday: number;
  venueClaimsToday: number;
  userCooldownActive: boolean;
  timeWindowOpen: boolean;
  eligible: boolean;
};

export function evaluateClaimRules(ctx: RuleContext): { ok: true } | { ok: false; reasonCode: P3RejectionCode } {
  if (!ctx.eligible) return { ok: false, reasonCode: P3RejectionCode.NOT_ELIGIBLE };
  if (!ctx.timeWindowOpen) return { ok: false, reasonCode: P3RejectionCode.TIME_WINDOW_CLOSED };
  if (ctx.userCooldownActive) return { ok: false, reasonCode: P3RejectionCode.USER_COOLDOWN_ACTIVE };
  if (ctx.userClaimsToday >= 1) return { ok: false, reasonCode: P3RejectionCode.USER_LIMIT_REACHED };
  if (ctx.venueClaimsToday >= 50) return { ok: false, reasonCode: P3RejectionCode.VENUE_LIMIT_REACHED };
  return { ok: true };
}

// placeholder signature to show intended call site
export function buildRuleContext(_attempt: P3ClaimAttempt): RuleContext {
  return {
    userClaimsToday: 0,
    venueClaimsToday: 0,
    userCooldownActive: false,
    timeWindowOpen: true,
    eligible: true,
  };
}
