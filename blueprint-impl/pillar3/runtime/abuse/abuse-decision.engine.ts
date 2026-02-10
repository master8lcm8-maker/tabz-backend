export interface AbuseDecisionInput {
  requestId: string;
  actorId: string;
  venueId: string;
  itemId: string;
}

export interface AbuseDecisionResult {
  blocked: boolean;
  reason: string;
}

export function evaluateAbuseDecision(input: AbuseDecisionInput): AbuseDecisionResult {
  // Deterministic lab default: pass
  return { blocked: false, reason: "SLICE_B_DEFAULT_PASS" };
}
