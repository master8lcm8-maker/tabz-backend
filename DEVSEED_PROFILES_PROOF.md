# DEV-SEED + PROFILES FINAL PROOF (2025-12-31)

* staff JWT payload: sub=6 role=staff venueId=4
* GET /profiles/demo-owner-5 OK
* GET /profiles/buyer-4 OK
* GET /profiles/staff-6 OK
* /dev-seed/all idempotent and uniqueness query em## Step 3 — Auth ↔ Profile Binding (CANONICAL) ✅
* 
* Canonical identity endpoint:
* \- GET /auth/me
* 
* Guaranteed contract:
* \- userId
* \- email
* \- role
* \- venueId
* \- profileId
* \- profile (authoritative)
* 
* Proof:
* \- scripts/proof-auth-me.ps1
* \- proofs/proof-auth-me-<timestamp>.log
* pty
