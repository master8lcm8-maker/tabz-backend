/**
 * PILLAR 5 — Diagnostics Reference (Slice A / Add-only)
 * Placeholder for production diagnostics endpoints (no wiring).
 */
export const diagnosticsRef = {
  required: true,
  endpoints: [
    { path: "/health", purpose: "basic health" },
    { path: "/health/db", purpose: "db connectivity (optional)" },
  ],
  correlation: { traceId: true },
};
