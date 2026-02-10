/**
 * PILLAR 5 — Signing Contracts (Slice A / Add-only)
 * iOS/Android signing configuration placeholders (no secrets).
 */
export type IosSigningConfig = {
  teamId?: string;
  provisioningProfile?: "AppStore" | "AdHoc" | "Development" | string;
  bundleId?: string;
};

export type AndroidSigningConfig = {
  keystorePath?: string;
  keyAlias?: string;
  storePasswordEnv?: string; // env var name only
  keyPasswordEnv?: string;   // env var name only
};

export type SigningContract = {
  ios: IosSigningConfig;
  android: AndroidSigningConfig;
  notes?: string;
};
