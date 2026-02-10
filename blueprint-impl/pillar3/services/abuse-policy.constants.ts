/**
 * PILLAR 3 — Abuse Policy Constants (Slice A / Add-only)
 * Explicit rate limit policy surface (no runtime wiring).
 */
export const P3_ABUSE_POLICY = {
  claimAttempt: { windowSeconds: 30, max: 10 },
  createDrop: { windowSeconds: 60, max: 20 },
  spotlightTrigger: { windowSeconds: 60, max: 5 },
  generic: { windowSeconds: 60, max: 60 },
} as const;

export type P3AbusePolicyKey = keyof typeof P3_ABUSE_POLICY;
