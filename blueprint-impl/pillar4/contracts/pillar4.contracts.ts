export type ISODateString = string;

export enum P4FraudFlag {
  SAME_DEVICE = "SAME_DEVICE",
  SAME_IP_BURST = "SAME_IP_BURST",
  REPLAY_CODE = "REPLAY_CODE",
  SELF_REFERRAL = "SELF_REFERRAL",
  BOT_PATTERN = "BOT_PATTERN",
}

export type P4ReferralCode = {
  code: string;
  inviterUserId: string;
  createdAt: ISODateString;
  disabled: boolean;
};

export type P4Attribution = {
  invitedUserId: string;
  inviterUserId: string;
  code: string;
  attributedAt: ISODateString;
  deviceFingerprintHash?: string;
  ipHash?: string;
  userAgentHash?: string;
};

export type P4RewardEvent = {
  id: string;
  inviterUserId: string;
  invitedUserId: string;
  code: string;
  kind: "REFERRAL_SIGNUP" | "REFERRAL_FIRST_ACTION";
  amountCents: number;
  createdAt: ISODateString;
  suppressedByFraud: boolean;
  fraudFlags?: P4FraudFlag[];
};

export type P4SharePayload = {
  message: string;
  deepLink: string;
  webUrl: string;
};
