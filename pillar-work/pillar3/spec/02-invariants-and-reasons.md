# Pillar 3 — Invariants + Rejection Reason Codes (Blueprint)

## Global invariants
- Claims are **atomic**: a single claim cannot be granted twice.
- Expired drops cannot be claimed.
- A claim MUST return either:
  - success event, or
  - rejection event with reasonCode

## FreeBoard / Claim invariants
- A claim is rejected if ANY of:
  - DROP_NOT_FOUND
  - DROP_EXPIRED
  - DROP_OUT_OF_STOCK
  - USER_COOLDOWN_ACTIVE
  - USER_LIMIT_REACHED
  - VENUE_LIMIT_REACHED
  - NOT_ELIGIBLE
  - TIME_WINDOW_CLOSED
  - CONCURRENCY_CONFLICT

## Spotlight invariants
- Only one active spotlight per venue feed slot (priority rules resolve conflicts)
- Duration is deterministic given inputs
- Trigger recorded in event log

## Abuse prevention invariants
- Rate limiting applies to claim attempts and spotlight triggers
- Farming/anomaly flags can force:
  - soft reject (reasonCode: ABUSE_SUSPECTED)
  - hard block (reasonCode: ABUSE_BLOCKED)

## Canonical reason codes (P3)
DROP_NOT_FOUND
DROP_EXPIRED
DROP_OUT_OF_STOCK
USER_COOLDOWN_ACTIVE
USER_LIMIT_REACHED
VENUE_LIMIT_REACHED
NOT_ELIGIBLE
TIME_WINDOW_CLOSED
CONCURRENCY_CONFLICT
ABUSE_SUSPECTED
ABUSE_BLOCKED
