/**
 * Pillar 3 Events — Blueprint-only contracts
 * NOT application code.
 */
export type DropCreatedEvent = {
  type: "DROP_CREATED";
  dropId: string;
  venueId: number;
  qty: number;
  expiresAt?: string;
};

export type DropClaimedEvent = {
  type: "DROP_CLAIMED";
  dropId: string;
  venueId: number;
  userId: number;
  claimedAt: string;
};

export type SpotlightActivatedEvent = {
  type: "SPOTLIGHT_ACTIVATED";
  venueId: number;
  triggeredByUserId?: number;
  durationSeconds: number;
  priority: number;
};

export type EngagementRejectedEvent = {
  type: "ENGAGEMENT_REJECTED";
  reasonCode: string;
  detail?: string;
};
