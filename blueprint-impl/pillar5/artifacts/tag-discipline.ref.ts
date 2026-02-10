/**
 * PILLAR 5 — Tag Discipline Reference (Slice A / Add-only)
 * Documents LOCK-* immutability requirement.
 */
export const tagDisciplineRef = {
  required: true,
  pattern: "LOCK-*",
  rule: "Immutable tags enforced on remote; never force-move LOCK tags.",
};
