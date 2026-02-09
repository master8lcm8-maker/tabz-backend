/**
 * Retention Loop (stub) — streaks + bonuses + timers
 * Not app code. Placeholder blueprint.
 */
export type StreakState = {
  userId: number;
  currentStreakDays: number;
  bestStreakDays: number;
  lastActiveAt: string;
};

export type ReturnBonus = {
  userId: number;
  offeredAt: string;
  expiresAt: string;
  claimedAt?: string;
  amountCents: number;
};
