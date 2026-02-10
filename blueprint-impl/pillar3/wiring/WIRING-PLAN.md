# Pillar 3 — Wiring Plan (DEFERRED)
DO NOT EXECUTE until: AUTHORIZED TO WIRE

Targets (future):
- Nest module creation + providers
- Controllers routes mapping
- DB migrations (from planned.schema.ts -> real migrations)
- Event publishing surface (pillar3.events.ts)
- Integration points: auth/roles, venue ownership, wallet/ledger reference (read-only)

Explicit rule:
- Any src/** edits are forbidden until authorized.

Validation steps (future):
- unit tests for ClaimDecision + AbuseDecision
- integration tests for drop->claim->history flow
