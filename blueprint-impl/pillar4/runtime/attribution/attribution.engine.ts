export interface AttributionDecisionInput {
  code: string;
  invitedUserId: string;
}

export interface AttributionDecisionResult {
  attributed: boolean;
  inviterUserId?: string;
  reason: string;
}

export function evaluateAttributionDecision(input: AttributionDecisionInput): AttributionDecisionResult {
  // Deterministic lab default: attributed to demo inviter
  return { attributed: true, inviterUserId: "inviter-demo", reason: "SLICE_B_DEFAULT_ATTRIBUTED" };
}
