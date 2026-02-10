# Pillar 3 — Slice A Implementation Skeleton (ADD-ONLY)

## What this is
This folder is **implementation skeleton** code for Pillar 3, isolated under `blueprint-impl/**`.
It is safe to commit because:
- it does **not** touch `src/**`
- it has **no runtime wiring**
- it is deterministic and policy-driven

## What is included (Slice A)
- Claim decision truth-table (`services/decisions/claim-decision.service.ts`)
- Canonical rejection reason codes (`policies/reason-codes.ts`)
- Abuse prevention skeleton (rate limit + farming + anomaly flags)
- Read-only history query contracts + empty query service

## What is explicitly NOT included
- No TypeORM wiring
- No Nest module/controller wiring
- No DB migrations applied
- No integration with existing auth/users/venues

## Wiring later (DEFERRED — do not do until AUTHORIZED TO WIRE)
When Slice A is finished end-to-end, wiring can be done by:
1) Creating a new Nest module under `src/modules/engagement/**` (or equivalent)
2) Importing these services and connecting:
   - drop store
   - claim persistence
   - event bus
3) Enforcing `P3ReasonCode` mapping on every claim attempt
4) Adding real rate-limit storage + anomaly scoring

**Do not wire until Troy explicitly says: `AUTHORIZED TO WIRE PILLAR 3`.**
