export interface SigningDecision {
  iosSigningReady: boolean;
  androidSigningReady: boolean;
  reason?: string;
}
