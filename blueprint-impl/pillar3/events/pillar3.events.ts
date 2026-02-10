import { ISODateString, P3RejectionCode } from "../contracts/pillar3.contracts";

export type P3Event =
  | { type: "P3_DROP_CREATED"; at: ISODateString; dropId: string; venueId: string; userId: string }
  | { type: "P3_CLAIM_OK"; at: ISODateString; claimId: string; dropId: string; venueId: string; userId: string }
  | { type: "P3_CLAIM_REJECTED"; at: ISODateString; dropId: string; venueId: string; userId: string; reasonCode: P3RejectionCode }
  | { type: "P3_SPOTLIGHT_ON"; at: ISODateString; spotlightId: string; venueId: string; userId: string }
  | { type: "P3_ABUSE_FLAGGED"; at: ISODateString; venueId: string; userId: string; reasonCode: P3RejectionCode };

export function nowIso(): ISODateString {
  return new Date().toISOString();
}
