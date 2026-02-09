/**
 * Spotlight / Boost (stub)
 * Not app code. Placeholder blueprint.
 */
export type SpotlightBoost = {
  id: number;
  venueId: number;
  triggeredByUserId: number;
  startsAt: string;
  endsAt: string;
  priority: number;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
};
