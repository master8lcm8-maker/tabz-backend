export interface BindingDecisionInput {
  invitedUserId: string;
  inviterUserId: string;
}

export interface BindingDecisionResult {
  bound: boolean;
  reason: string;
}

export function evaluateBindingDecision(input: BindingDecisionInput): BindingDecisionResult {
  // Deterministic lab default: bind allowed
  return { bound: true, reason: "SLICE_B_DEFAULT_BIND" };
}
