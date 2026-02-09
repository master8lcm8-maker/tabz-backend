# TABZ Cert-Engine (Pillars 3–5) — Authoritative

## Purpose
Add-only certification system to lock Pillars 3–5 without touching TABZ app code.

## Key rules
- Contracts define required booleans (must be provable)
- Detectors read ONLY `evidence/pillarX` (prevents false greens)
- Evaluator compares contract leaf booleans to evidence leaf booleans
- Lock writer emits immutable lock JSON under `locks/pillarX`

## Run
- Build: `npx tsc -p tsconfig.cert-engine.json`
- Cert:  `node dist/cert-engine/run-cert.js pillar3|pillar4|pillar5`

## Evidence
Place proof artifacts only under:
- `evidence/pillar3`
- `evidence/pillar4`
- `evidence/pillar5`

No other repo paths are scanned.
