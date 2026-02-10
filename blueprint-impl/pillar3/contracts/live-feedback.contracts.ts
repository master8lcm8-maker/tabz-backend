/**
 * PILLAR 3 — Live Feedback Contracts (Slice A / Add-only)
 * Canonical shapes for UI confirmation/rejection/ack flows.
 */
export enum P3LiveEventType {
  CLAIM_SUCCESS = "CLAIM_SUCCESS",
  CLAIM_REJECTED = "CLAIM_REJECTED",
  DROP_CREATED = "DROP_CREATED",
  SPOTLIGHT_TRIGGERED = "SPOTLIGHT_TRIGGERED",
}

export type P3LiveAck = {
  ack: true;
  eventId: string;
  at: string;
};

export type P3LiveEvent<TPayload = unknown> = {
  eventId: string;
  type: P3LiveEventType | string;
  at: string;
  payload: TPayload;
};

export type P3RejectionPayload = {
  reasonCode: string;
  message?: string;
  details?: Record<string, unknown>;
};
