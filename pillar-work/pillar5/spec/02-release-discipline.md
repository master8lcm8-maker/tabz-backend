# Pillar 5 — Release Discipline (Blueprint)

## Versioning rules
- Every release must record:
  - semver (x.y.z)
  - build number / version code
  - git tag (immutable lock tag when required)
- No "silent" rebuilds of the same version.

## Reproducibility minimums
- lockfile committed
- deterministic build steps documented
- build artifacts recorded (hashes)

## Observability minimums
- Crash capture enabled
- Error logging with correlation id (traceId)
- Production diagnostics endpoints documented

## Ops safety minimums
- Rollback runbook exists
- Hotfix protocol exists
- Tag discipline enforced (LOCK-* immutable)
