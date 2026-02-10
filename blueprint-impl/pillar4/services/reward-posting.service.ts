/**
 * PILLAR 4 — Reward Posting (Slice A / Add-only)
 * Ledger-based rewards MUST be represented as planned ledger entries (unwired).
 */
export type PlannedLedgerEntry = {
  kind: "CREDIT_ISSUE" | "CREDIT_TRANSFER" | "CREDIT_BURN" | string;
  amountCents: number;
  currency: "CREDITS" | "USD" | string;
  toUserId: number;
  fromUserId?: number;
  memo?: string;
  externalRef?: string; // e.g., referral event id
};

export class RewardPostingService {
  buildReferralSignupReward(inviterUserId: number, invitedUserId: number, referralCode: string): PlannedLedgerEntry[] {
    return [
      {
        kind: "CREDIT_ISSUE",
        amountCents: 100,
        currency: "CREDITS",
        toUserId: inviterUserId,
        memo: `Referral signup reward for code=${referralCode} invited=${invitedUserId}`,
        externalRef: `REF_SIGNUP:${referralCode}:${invitedUserId}`,
      },
    ];
  }

  buildFirstActionReward(inviterUserId: number, invitedUserId: number, referralCode: string): PlannedLedgerEntry[] {
    return [
      {
        kind: "CREDIT_ISSUE",
        amountCents: 300,
        currency: "CREDITS",
        toUserId: inviterUserId,
        memo: `Referral first-action reward for code=${referralCode} invited=${invitedUserId}`,
        externalRef: `REF_ACTION:${referralCode}:${invitedUserId}`,
      },
    ];
  }
}
