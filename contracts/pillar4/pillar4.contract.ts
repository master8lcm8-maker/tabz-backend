/**
 * PILLAR 4 — GROWTH & NETWORK EFFECTS
 * Defines what must be provable.
 * No implementation.
 */

export const Pillar4Contract = {
  pillar: "pillar4",

  affiliate: {
    codeGenerationExists: false,
    attributionOnSignupExists: false,
    inviterBindingExists: false,
    rewardEventsExist: false,
    fraudPreventionExists: false,
  },

  viralSharing: {
    sharePayloadExists: false,
    deepLinkRoutingExists: false,
    osShareIntegrationExists: false,
  },

  retention: {
    streakLogicExists: false,
    returnIncentivesExist: false,
    timedEventsExist: false,
  },

  attribution: {
    referralToSignupTracked: false,
    signupToActionTracked: false,
    rewardEligibilityTraceable: false,
  },
} as const;
