/**
 * Engagement Activity Log (stub)
 * Not app code. Placeholder blueprint.
 */
export type EngagementLogEntry = {
  id: number;
  actorUserId?: number;
  venueId?: number;
  kind: "DROP" | "CLAIM" | "BOOST";
  action: string;
  at: string;
  meta?: Record<string, unknown>;
  immutable: true;
};
