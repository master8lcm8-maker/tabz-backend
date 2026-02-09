# Pillar 3 — Engagement Mechanics (Spec)

## Components
1) FreeBoard (Drop & Claim)
- Drop creation (venue), qty, expiry, claim cooldown, eligibility checks, concurrency protection

2) Claim Rules Engine
- per-user caps, per-venue caps, time windows, conflict rules, validation middleware

3) Spotlight / Boost
- trigger/purchase, duration math, overlap resolution, priority queue

4) Live Feedback
- confirmations, rejection reasons, event emissions/acks (future websockets)

5) Engagement History
- immutable activity log for drops/claims/boosts

6) Abuse Prevention
- rate limits, farming detection, anomaly flags, auto-block hooks

## Notes
- This folder is blueprint/stubs only. Not app code.
- When authorized later, stubs are migrated into real Nest modules/entities.
