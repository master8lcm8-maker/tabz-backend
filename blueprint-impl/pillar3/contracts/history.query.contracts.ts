/**
 * PILLAR 3 — History Query Contracts (Slice A / Add-only)
 * Query/filter shapes for engagement timeline reads.
 */
export type P3HistoryFilter = {
  userId?: number;
  venueId?: number;
  types?: Array<"claim" | "drop" | "boost" | "spotlight" | string>;
  after?: string;   // ISO
  before?: string;  // ISO
  limit?: number;   // default 50
};

export type P3HistoryPage<T> = {
  items: T[];
  nextCursor?: string;
};
