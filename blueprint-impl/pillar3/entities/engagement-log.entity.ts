export type EngagementLogEntity = {
  id: string;
  venueId: string;
  userId: string;
  kind: string;
  at: string;
  refId?: string;
  reasonCode?: string;
  metaJson?: string;
};
