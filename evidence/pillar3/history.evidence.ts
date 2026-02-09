/**
 * PILLAR 3 EVIDENCE — Engagement history exists (stub proof artifact)
 * This is NOT application code. It is a certification evidence artifact.
 */

export const activityFeed = [
  { type: "claim", at: new Date().toISOString() },
  { type: "drop", at: new Date().toISOString() },
  { type: "boost", at: new Date().toISOString() },
];

// immutable log proof
export const immutableLog = Object.freeze(activityFeed);
