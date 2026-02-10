export interface RewardEligibility {
  eligible: boolean;
  blockedByFraud?: boolean;
  reason?: string;
}
