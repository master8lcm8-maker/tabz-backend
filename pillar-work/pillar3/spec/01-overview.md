# Pillar 3 — Engagement Mechanics (Blueprint Spec)

**Scope:** Engagement systems that consume economy results and amplify user behavior.  
**Non-scope:** Wallet math, payments, Stripe, credits ledgers (Pillar 2).

## Components
### 3.1 FreeBoard — Drop & Claim
- Venue creates Drops (qty, expiry, eligibility)
- Users claim Drops (cooldowns, per-user/per-venue caps)
- Concurrency: claim must be atomic (no double-claims)
- Expiry: claims blocked after expiry; drops may be archived

### 3.2 Claim Rules Engine
- Per-user caps (daily/weekly)
- Per-venue caps
- Time windows (e.g., only during venue hours)
- Cooldown logic
- Conflict resolution + reason codes

### 3.3 Spotlight / Boost
- Trigger types: paid boost, staff-triggered boost, time-based boost
- Duration math + non-overlap/priority rules
- Priority queue concept (venue feed ranking)

### 3.4 Live Feedback
- Event emission (success/fail) with reason codes
- Acknowledgements (client received)
- Delivery channel is unspecified here (websocket/push/etc.) — only event contract is defined

### 3.5 Engagement History
- Immutable event log (claims, drops, boosts)
- User timeline views derived from log

### 3.6 Abuse Prevention
- Rate limiting + throttles
- Farming detection heuristics
- Anomaly flags + autoblock states

## Deliverables (Blueprint-Level)
- Event contracts (payloads, ids)
- DTO stubs + interface signatures
- Data model outlines (no DB migrations here)

## Success Criteria
- Pillar 3 behaviors are defined with enforceable server-side invariants.
- Abuse surface is explicitly covered with reason codes and throttles.
