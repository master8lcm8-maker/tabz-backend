/**
 * Pillar 3 Contracts (Slice A - isolated)
 * No runtime wiring. No src imports.
 */

export type ISODateString = string;

export enum P3RejectionCode {
  DROP_NOT_FOUND = "DROP_NOT_FOUND",
  DROP_EXPIRED = "DROP_EXPIRED",
  DROP_OUT_OF_STOCK = "DROP_OUT_OF_STOCK",
  USER_COOLDOWN_ACTIVE = "USER_COOLDOWN_ACTIVE",
  USER_LIMIT_REACHED = "USER_LIMIT_REACHED",
  VENUE_LIMIT_REACHED = "VENUE_LIMIT_REACHED",
  NOT_ELIGIBLE = "NOT_ELIGIBLE",
  TIME_WINDOW_CLOSED = "TIME_WINDOW_CLOSED",
  CONCURRENCY_CONFLICT = "CONCURRENCY_CONFLICT",
  ABUSE_SUSPECTED = "ABUSE_SUSPECTED",
  ABUSE_BLOCKED = "ABUSE_BLOCKED",
}

export type P3Drop = {
  dropId: string;
  venueId: string;
  createdByUserId: string;
  title: string;
  qtyTotal: number;
  qtyRemaining: number;
  createdAt: ISODateString;
  expiresAt: ISODateString | null;
  cooldownSeconds: number; // per-user cooldown
};

export type P3ClaimAttempt = {
  dropId: string;
  userId: string;
  venueId: string;
  at: ISODateString;
  deviceFingerprintHash?: string;
  ipHash?: string;
};

export type P3ClaimResult =
  | { ok: true; claimId: string; dropId: string; userId: string; venueId: string; at: ISODateString }
  | { ok: false; dropId: string; userId: string; venueId: string; at: ISODateString; reasonCode: P3RejectionCode };

export type P3Spotlight = {
  spotlightId: string;
  venueId: string;
  triggeredByUserId: string;
  startedAt: ISODateString;
  endsAt: ISODateString;
  durationSeconds: number;
  priority: number;
};

export type P3EngagementLogEntry = {
  id: string;
  venueId: string;
  userId: string;
  kind: "DROP_CREATED" | "CLAIM_OK" | "CLAIM_REJECTED" | "SPOTLIGHT_ON" | "ABUSE_FLAGGED";
  at: ISODateString;
  refId?: string; // dropId/claimId/spotlightId
  reasonCode?: P3RejectionCode;
  meta?: Record<string, unknown>;
};
