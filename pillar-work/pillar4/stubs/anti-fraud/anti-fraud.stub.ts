/**
 * Anti-fraud Heuristics (stub)
 * Not app code. Placeholder blueprint.
 */
export type ReferralFraudSignal = {
  id: number;
  invitedUserId: number;
  inviterUserId: number;
  signal: "SAME_DEVICE" | "SAME_IP" | "BURST_SIGNUPS" | "SUSPICIOUS_PATTERN";
  severity: 1 | 2 | 3 | 4 | 5;
  detectedAt: string;
  notes?: string;
};
