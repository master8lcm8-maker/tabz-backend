/**
 * FreeBoard Claim (stub)
 * Not app code. Placeholder blueprint.
 */
export type Claim = {
  id: number;
  dropId: number;
  userId: number;
  claimedAt: string;
  status: "CLAIMED" | "REJECTED";
  rejectionReason?: string;
};
