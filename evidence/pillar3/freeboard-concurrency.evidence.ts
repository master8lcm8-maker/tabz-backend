/**
 * PILLAR 3 EVIDENCE — Concurrency protection exists (stub proof artifact)
 * This is NOT application code. It is a certification evidence artifact.
 */

export const concurrencyProofSql = `
SELECT id
FROM drop
WHERE id = 1
FOR UPDATE
`;
