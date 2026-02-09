/**
 * PILLAR 3 — ENGAGEMENT MECHANICS
 * Certification contract.
 * Nothing here implements behavior.
 * Everything here defines what must be provable.
 */

export const Pillar3Contract = {
  pillar: "pillar3",
  freeBoard: {
    dropCreationExists: false,
    inventoryTrackingExists: false,
    expiryHandlingExists: false,
    concurrencyProtectionExists: false,
  },

  claimRules: {
    perUserLimits: false,
    perVenueLimits: false,
    timeWindows: false,
    eligibilityValidation: false,
  },

  spotlight: {
    boostTriggerExists: false,
    durationMathExists: false,
    priorityResolutionExists: false,
  },

  liveFeedback: {
    successEvents: false,
    rejectionReasons: false,
    acknowledgements: false,
  },

  history: {
    claimHistoryReadable: false,
    dropHistoryReadable: false,
    boostHistoryReadable: false,
  },

  abusePrevention: {
    rateLimitingExists: false,
    farmingDetectionExists: false,
    anomalyFlagsExist: false,
  },
} as const;
