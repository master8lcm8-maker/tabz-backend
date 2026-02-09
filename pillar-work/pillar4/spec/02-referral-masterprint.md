# Pillar 4 — Affiliate/Referral Masterprint (Blueprint)

## Core truth chain
inviter -> referralCode/link -> signup attribution -> binding -> action -> reward event

## Invariants (non-negotiable)
- A signup can be attributed to **at most 1** inviter.
- Binding is immutable once set:
  - (invitedUserId) cannot be rebound to a different inviter.
- Reward eligibility must be traceable:
  - each reward event links to inviterUserId + invitedUserId + code + proof fields
- Fraud prevention can suppress rewards without deleting attribution.

## Minimum fraud heuristics (server-enforced)
- SAME_DEVICE (multiple invited accounts from same device fingerprint)
- SAME_IP_BURST (burst signups from same IP)
- REPLAY_CODE (same device attempts repeated codes)
- SELF_REFERRAL (inviter == invited)
- BOT_PATTERN (timing signature)

## Required events
- REFERRAL_ATTRIBUTED
- REWARD_TRIGGERED
- FRAUD_FLAGGED

## Proof fields (blueprint only)
- deviceFingerprintHash
- ipHash
- userAgentHash
- attributedAt
- firstActionAt (when applicable)
