/**
 * PILLAR 4 — Attribution Tracking Contracts (Slice A / Add-only)
 * Captures chain: referral -> signup -> action
 */
export enum P4AttributionEventType {
  REFERRAL_ATTRIBUTED = "REFERRAL_ATTRIBUTED",
  SIGNUP_COMPLETED = "SIGNUP_COMPLETED",
  FIRST_ACTION = "FIRST_ACTION",
  REWARD_TRIGGERED = "REWARD_TRIGGERED",
  FRAUD_FLAGGED = "FRAUD_FLAGGED",
}

export type P4AttributionProofFields = {
  deviceFingerprintHash?: string;
  ipHash?: string;
  userAgentHash?: string;
  attributedAt?: string;
  firstActionAt?: string;
};

export type P4AttributionEvent<TPayload = unknown> = {
  eventId: string;
  type: P4AttributionEventType | string;
  at: string;
  inviterUserId?: number;
  invitedUserId?: number;
  referralCode?: string;
  payload?: TPayload;
  proof?: P4AttributionProofFields;
};
