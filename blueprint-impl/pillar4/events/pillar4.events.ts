import { ISODateString, P4FraudFlag } from "../contracts/pillar4.contracts";

export type P4Event =
  | { type: "P4_REFERRAL_CODE_CREATED"; at: ISODateString; inviterUserId: string; code: string }
  | { type: "P4_REFERRAL_ATTRIBUTED"; at: ISODateString; inviterUserId: string; invitedUserId: string; code: string }
  | { type: "P4_FRAUD_FLAGGED"; at: ISODateString; inviterUserId: string; invitedUserId: string; flags: P4FraudFlag[] }
  | { type: "P4_REWARD_TRIGGERED"; at: ISODateString; rewardId: string; kind: string; amountCents: number };
