/**
 * Reward Event (stub) — ledger compatible
 * Not app code. Placeholder blueprint.
 */
export type RewardEvent = {
  id: number;
  kind: "REFERRAL_SIGNUP" | "REFERRAL_FIRST_ACTION";
  inviterUserId: number;
  invitedUserId: number;
  attributedAt: string;
  eligibleAt: string;
  rewardedAt?: string;

  // ledger compatibility (do not implement here)
  ledgerEntryId?: number;
  amountCents: number;
  currency: "USD";
};
