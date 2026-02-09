// Pillar 3 — Canonical Blueprint Contracts (NO IMPLEMENTATION)

export const P3Events = {
  CLAIM_ACCEPTED: "P3.CLAIM_ACCEPTED",
  CLAIM_REJECTED: "P3.CLAIM_REJECTED",
  DROP_CREATED: "P3.DROP_CREATED",
  DROP_EXPIRED: "P3.DROP_EXPIRED",
  SPOTLIGHT_TRIGGERED: "P3.SPOTLIGHT_TRIGGERED",
  ABUSE_FLAGGED: "P3.ABUSE_FLAGGED",
} as const;

export type P3EventName = typeof P3Events[keyof typeof P3Events];

export const P3RejectReasons = {
  DROP_NOT_FOUND: "DROP_NOT_FOUND",
  DROP_EXPIRED: "DROP_EXPIRED",
  DROP_OUT_OF_STOCK: "DROP_OUT_OF_STOCK",
  USER_COOLDOWN_ACTIVE: "USER_COOLDOWN_ACTIVE",
  USER_LIMIT_REACHED: "USER_LIMIT_REACHED",
  VENUE_LIMIT_REACHED: "VENUE_LIMIT_REACHED",
  NOT_ELIGIBLE: "NOT_ELIGIBLE",
  TIME_WINDOW_CLOSED: "TIME_WINDOW_CLOSED",
  CONCURRENCY_CONFLICT: "CONCURRENCY_CONFLICT",
  ABUSE_SUSPECTED: "ABUSE_SUSPECTED",
  ABUSE_BLOCKED: "ABUSE_BLOCKED",
} as const;

export type P3RejectReason = typeof P3RejectReasons[keyof typeof P3RejectReasons];

export interface P3ClaimRejected {
  event: typeof P3Events.CLAIM_REJECTED;
  claimId: string;
  userId: number;
  venueId: number;
  dropId: number;
  reasonCode: P3RejectReason;
  at: string; // ISO
}

export interface P3ClaimAccepted {
  event: typeof P3Events.CLAIM_ACCEPTED;
  claimId: string;
  userId: number;
  venueId: number;
  dropId: number;
  at: string; // ISO
}

export type P3Event = P3ClaimAccepted | P3ClaimRejected;
