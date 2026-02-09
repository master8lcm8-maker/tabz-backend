# TABZ Blueprint Authority (Pillars 3–5)

## Purpose
This folder is a **blueprint/specification pack** only.
It defines:
- contracts (types/enums/event payload shapes)
- invariants/reason codes
- stub placeholders
- runbooks/checklists

It does **NOT** implement behavior.

## Authority Rules (Non-negotiable)
1) **Source of truth for LOCKS**: cert-engine ONLY  
   - `cert-engine/run-cert.ts` + detectors generate lock files under `/locks/**`.
   - Anything under `pillar-work/**` is NOT a lock generator.

2) **No old-code edits**  
   - Do not modify existing application code as part of blueprint work.
   - Blueprint changes must be **add-only** unless explicitly authorized.

3) **No duplicate truth sources**  
   - If a “snapshot” file exists (e.g., `BLUEPRINT-LOCK-*.json`), it is human-readable only.
   - Snapshots must never be used as program inputs and must never compete with cert-engine locks.

## Folder map
- `pillar-work/pillar3/spec/**` — narrative specs + invariants + reason codes
- `pillar-work/pillar3/contracts/**` — canonical types/enums/event payloads
- `pillar-work/pillar3/stubs/**` — placeholders (no runtime wiring)

Same structure applies to Pillars 4 and 5.

## Implementation rule
Implementation MUST conform to:
- `pillar-work/**/contracts/*.ts`
- `pillar-work/**/spec/*.md`
If implementation differs, blueprint must be updated first (by add-only), or the implementation is rejected.
