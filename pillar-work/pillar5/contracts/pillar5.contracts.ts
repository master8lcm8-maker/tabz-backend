// Pillar 5 — Canonical Blueprint Contracts (NO IMPLEMENTATION)

export const P5Artifacts = {
  PRIVACY_POLICY: "P5.PRIVACY_POLICY",
  TERMS_OF_SERVICE: "P5.TERMS_OF_SERVICE",
  ACCOUNT_DELETION: "P5.ACCOUNT_DELETION",
  SUPPORT_CONTACT: "P5.SUPPORT_CONTACT",
  REVIEWER_CREDENTIALS: "P5.REVIEWER_CREDENTIALS",
  RELEASE_RUNBOOK: "P5.RELEASE_RUNBOOK",
  ROLLBACK_RUNBOOK: "P5.ROLLBACK_RUNBOOK",
} as const;

export type P5ArtifactName = typeof P5Artifacts[keyof typeof P5Artifacts];

export interface P5ReleaseRecord {
  semver: string;          // x.y.z
  buildNumber: number;     // iOS CFBundleVersion / Android versionCode
  gitTag: string;          // immutable when required
  builtAt: string;         // ISO
  artifactHashes: Record<string, string>; // filename -> hash
}

export interface P5ObservabilitySpec {
  crashReportingProvider: "Sentry" | "FirebaseCrashlytics" | "Other";
  errorLogging: boolean;
  traceIdRequired: boolean;
  diagnosticsDocumented: boolean;
}
