/**
 * PILLAR 4 — Retention Timers Contracts (Slice A / Add-only)
 * Models limited-time events + scheduled resets.
 */
export enum P4TimerType {
  DAILY_RESET = "DAILY_RESET",
  WEEKLY_RESET = "WEEKLY_RESET",
  LIMITED_EVENT_END = "LIMITED_EVENT_END",
  RETURN_INCENTIVE = "RETURN_INCENTIVE",
}

export type P4ScheduledTimer = {
  id: string;
  type: P4TimerType | string;
  fireAt: string; // ISO
  payload?: Record<string, unknown>;
};

export type P4StreakState = {
  userId: number;
  streakDays: number;
  lastActiveAt?: string;
};
