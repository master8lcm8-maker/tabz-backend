/**
 * Claim Rules (stub) — caps, cooldowns, windows
 * Not app code. Placeholder blueprint.
 */
export type ClaimRuleSet = {
  perUserDailyCap: number;
  perVenueDailyCap: number;
  cooldownMinutes: number;
  allowedWindows: Array<{ startHHMM: string; endHHMM: string }>;
};
