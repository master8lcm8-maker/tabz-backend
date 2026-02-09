/**
 * PILLAR 3 EVIDENCE — Claim rules engine exists (stub proof artifact)
 * This is NOT application code. It is a certification evidence artifact.
 */

export const claimRulesEngine = {
  eligibility: true,
  rules: true,
  perUser: { maxClaimsPerDay: 1 },
  perVenue: { maxClaimsPerDay: 50 },
  cooldownMinutes: 30,
  timeWindows: [{ start: "18:00", end: "23:59" }],
};
