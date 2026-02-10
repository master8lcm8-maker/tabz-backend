# SLICE A RESTORE (authoritative)
git fetch --tags -f
git checkout -f SLICE-A-20260209

# Proof
git rev-parse HEAD
git describe --tags --exact-match

# Safety: ensure src/** untouched expectation (repo-wide diff should be empty right after checkout)
git status --porcelain
