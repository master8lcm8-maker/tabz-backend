/**
 * Slice A — Abuse policy (skeleton, add-only).
 * This file defines minimum heuristics, not real enforcement.
 */

export type AbuseSignal = {
  userId: number;
  venueId: number;
  action: "CLAIM_ATTEMPT" | "SPOTLIGHT_TRIGGER";
  nowIso: string;
  // planned proof fields
  ipHash?: string;
  deviceFingerprintHash?: string;
  userAgentHash?: string;
  recentAttempts?: number; // precomputed later
};

export type AbuseOutcome = "ALLOW" | "SUSPECT" | "BLOCK";

export const AbuseHeuristics = Object.freeze({
  RATE_LIMIT_WINDOW_SECONDS: 60,
  MAX_ATTEMPTS_PER_WINDOW: 20,
  FARMING_BURST_THRESHOLD: 10,
  ANOMALY_SCORE_BLOCK: 100,
  ANOMALY_SCORE_SUSPECT: 50,
});
