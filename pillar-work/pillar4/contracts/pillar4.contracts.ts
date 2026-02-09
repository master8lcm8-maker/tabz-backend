// Pillar 4 — Canonical Blueprint Contracts (NO IMPLEMENTATION)

export const P4Events = {
  REFERRAL_ATTRIBUTED: "P4.REFERRAL_ATTRIBUTED",
  REWARD_TRIGGERED: "P4.REWARD_TRIGGERED",
  FRAUD_FLAGGED: "P4.FRAUD_FLAGGED",
} as const;

export type P4EventName = typeof P4Events[keyof typeof P4Events];

export const P4FraudHeuristics = {
  SAME_DEVICE: "SAME_DEVICE",
  SAME_IP_BURST: "SAME_IP_BURST",
  REPLAY_CODE: "REPLAY_CODE",
  SELF_REFERRAL: "SELF_REFERRAL",
  BOT_PATTERN: "BOT_PATTERN",
} as const;

export type P4FraudHeuristic = typeof P4FraudHeuristics[keyof typeof P4FraudHeuristics];

export interface P4ReferralAttributed {
  event: typeof P4Events.REFERRAL_ATTRIBUTED;
  referralCode: string;
  inviterUserId: number;
  invitedUserId: number;
  deviceFingerprintHash?: string;
  ipHash?: string;
  userAgentHash?: string;
  attributedAt: string; // ISO
}

export interface P4RewardTriggered {
  event: typeof P4Events.REWARD_TRIGGERED;
  referralCode: string;
  inviterUserId: number;
  invitedUserId: number;
  kind: "REFERRAL_SIGNUP" | "REFERRAL_FIRST_ACTION";
  amountCents: number;
  proof: {
    attributedAt: string;
    firstActionAt?: string;
  };
  at: string; // ISO
}

export interface P4FraudFlagged {
  event: typeof P4Events.FRAUD_FLAGGED;
  inviterUserId?: number;
  invitedUserId?: number;
  referralCode?: string;
  heuristic: P4FraudHeuristic;
  at: string; // ISO
}

export type P4Event = P4ReferralAttributed | P4RewardTriggered | P4FraudFlagged;
