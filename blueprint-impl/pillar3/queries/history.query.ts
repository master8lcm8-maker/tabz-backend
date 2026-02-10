/**
 * Slice A — Engagement history query contracts (skeleton).
 * Read-only interface: activity timeline.
 */

export type P3ActivityType = "claim" | "drop" | "boost" | "spotlight" | "abuse_flag";

export type P3ActivityItem = {
  id: string;
  type: P3ActivityType;
  atIso: string;
  venueId?: number;
  userId?: number;
  payload?: Record<string, unknown>;
};

export type P3HistoryQuery = {
  userId?: number;
  venueId?: number;
  limit?: number;
  cursor?: string;
};

export type P3HistoryPage = {
  items: P3ActivityItem[];
  nextCursor?: string;
};
