/**
 * Abuse Prevention (stub) — rate limits + anomaly flags
 * Not app code. Placeholder blueprint.
 */
export type RateLimitRule = {
  key: string;           // e.g. "claim"
  windowSeconds: number; // e.g. 60
  max: number;           // e.g. 5
};

export type AnomalyFlag = {
  id: number;
  userId: number;
  reason: string;
  score: number;
  createdAt: string;
  blockedUntil?: string;
};
