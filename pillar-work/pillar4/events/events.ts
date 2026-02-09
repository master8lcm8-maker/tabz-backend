/**
 * Pillar 4 Events — Blueprint-only contracts
 * NOT application code.
 */
export type ReferralAttributedEvent = {
  type: "REFERRAL_ATTRIBUTED";
  inviterUserId: number;
  invitedUserId: number;
  code: string;
  attributedAt: string;
};

export type RewardTriggeredEvent = {
  type: "REWARD_TRIGGERED";
  kind: "REFERRAL_SIGNUP" | "REFERRAL_FIRST_ACTION";
  inviterUserId: number;
  invitedUserId: number;
  amountCents: number;
  at: string;
};

export type FraudFlaggedEvent = {
  type: "FRAUD_FLAGGED";
  invitedUserId: number;
  reasons: string[];
  at: string;
};
