/**
 * PILLAR 5 — STORE LAUNCH & OPS FREEZE
 * Defines what must be provable.
 * No implementation.
 */

export const Pillar5Contract = {
  pillar: "pillar5",

  appStoreCompliance: {
    privacyPolicyExists: false,
    termsOfServiceExists: false,
    accountDeletionExists: false,
    supportContactExists: false,
    reviewerDemoCredentialsExist: false,
  },

  releasePipeline: {
    iosSigningConfigured: false,
    androidSigningConfigured: false,
    versioningDisciplineExists: false,
    buildReproducibilityExists: false,
  },

  observability: {
    crashReportingExists: false,
    errorLoggingExists: false,
    productionDiagnosticsExist: false,
  },

  operationalSafety: {
    rollbackProcedureExists: false,
    tagDisciplineExists: false,
    hotfixProtocolExists: false,
  },
} as const;
