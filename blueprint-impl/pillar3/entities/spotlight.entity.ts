export type SpotlightEntity = {
  id: string;
  venueId: string;
  triggeredByUserId: string;
  startedAt: string;
  endsAt: string;
  durationSeconds: number;
  priority: number;
};
