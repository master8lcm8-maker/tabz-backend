/**
 * Slice A — Pillar 3 canonical rejection reason codes (implementation skeleton).
 * ADD-ONLY namespace: blueprint-impl/**
 * No runtime wiring.
 */
export enum P3ReasonCode {
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

export type P3Reject = {
  ok: false;
  reasonCode: P3ReasonCode;
  message?: string;
  meta?: Record<string, unknown>;
};

export type P3Accept<T = unknown> = {
  ok: true;
  value?: T;
  meta?: Record<string, unknown>;
};

export type P3Decision<T = unknown> = P3Accept<T> | P3Reject;

export function reject(reasonCode: P3ReasonCode, message?: string, meta?: Record<string, unknown>): P3Reject {
  return { ok: false, reasonCode, message, meta };
}

export function accept<T = unknown>(value?: T, meta?: Record<string, unknown>): P3Accept<T> {
  return { ok: true, value, meta };
}
