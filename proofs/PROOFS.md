# TABZ Proof Index (Backend)

This file indexes proof artifacts committed under `proofs/`.

## Y1/Y2 Proof Artifacts (this chat)
- `PROOF-F-MOBILE-SHIPLOCK-20260203-224614.txt` — Mobile ship-lock proof snapshot (notes include tool/env + git state).
- `PROOF-STRIPE-CONNECT-SEAM-20260203-223119.txt` — Stripe/connect seam scan snapshot (code surface scan + git state).
- `PROOF-STRIPE-CONNECT-CODE.txt` — Grep-style code surface excerpt for stripe/connect keywords.

## How to validate presence
From repo root:
- `Get-ChildItem .\proofs\*PROOF*`

## Notes
This index intentionally contains no new logic—only pointers to committed proof artifacts.
