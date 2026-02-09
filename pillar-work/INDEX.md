# TABZ Pillars 3–5 — Blueprint Workspace (Authoritative)

## What this is
Blueprint/spec + stubs for Pillars 3–5, kept out of `src/**` (no app-code edits).
Certification engine exists under `cert-engine/` and scans ONLY `evidence/pillarX`.

## Pillar 3
- spec: pillar-work/pillar3/spec/README.md
- stubs:
  - freeboard (drop/claim)
  - claim-rules
  - spotlight
  - live-feedback (event envelope + rejection reasons)
  - history (engagement log)
  - abuse (rate limits + anomaly flags)

## Pillar 4
- spec: pillar-work/pillar4/spec/README.md
- stubs:
  - referrals (referral + share payload + retention)
  - attribution
  - rewards (ledger-compatible reward event)
  - anti-fraud

## Pillar 5
- spec: pillar-work/pillar5/spec/README.md
- stubs:
  - app-store compliance
  - release checklist
  - observability plan
  - ops safety

## Certification system
- build: `npx tsc -p tsconfig.cert-engine.json`
- run:  `node dist/cert-engine/run-cert.js pillar3|pillar4|pillar5`
- detectors scan: evidence/pillarX only
