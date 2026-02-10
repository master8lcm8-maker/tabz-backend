export interface RewardEligibilityInput {
  invitedUserId: string;
  eventType: string;
  fraudFlag?: boolean;
}

export interface RewardEligibilityResult {
  eligible: boolean;
  blockedByFraud: boolean;
  reason: string;
}

export function evaluateRewardEligibility(input: RewardEligibilityInput): RewardEligibilityResult {
  if (input.fraudFlag) return { eligible: false, blockedByFraud: true, reason: "FRAUD_BLOCK" };
  return { eligible: true, blockedByFraud: false, reason: "SLICE_B_DEFAULT_ELIGIBLE" };
}
