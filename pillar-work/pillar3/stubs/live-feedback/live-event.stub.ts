/**
 * Live Feedback Event Envelope (stub)
 * Not app code. Placeholder blueprint.
 */
export type LiveEvent = {
  eventId: string;
  type: "DROP_CREATED" | "CLAIM_ACCEPTED" | "CLAIM_REJECTED" | "BOOST_STARTED" | "BOOST_ENDED";
  at: string;
  userId?: number;
  venueId?: number;
  payload?: Record<string, unknown>;
  ackRequired: boolean;
};
