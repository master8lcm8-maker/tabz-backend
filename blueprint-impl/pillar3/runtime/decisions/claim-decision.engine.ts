export interface ClaimDecisionInput {
  requestId: string;
  actorId: string;
  venueId: string;
  itemId: string;
}

export interface ClaimDecisionResult {
  allowed: boolean;
  reason: string;
}

export function evaluateClaimDecision(input: ClaimDecisionInput): ClaimDecisionResult {
  // Deterministic lab default: allow
  return { allowed: true, reason: "SLICE_B_DEFAULT_ALLOW" };
}
