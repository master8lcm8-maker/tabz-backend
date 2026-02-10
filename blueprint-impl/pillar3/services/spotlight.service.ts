import { P3Spotlight } from "../contracts/pillar3.contracts";

export function computeSpotlight(venueId: string, userId: string, durationSeconds: number, priority: number): P3Spotlight {
  const now = Date.now();
  const startedAt = new Date(now).toISOString();
  const endsAt = new Date(now + durationSeconds * 1000).toISOString();
  return {
    spotlightId: "spot_" + Math.random().toString(36).slice(2),
    venueId,
    triggeredByUserId: userId,
    startedAt,
    endsAt,
    durationSeconds,
    priority,
  };
}
