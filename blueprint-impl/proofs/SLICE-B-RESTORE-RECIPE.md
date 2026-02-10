# SLICE B RESTORE (authoritative)
git fetch --tags -f
git checkout -f SLICE-B-20260209

# Proof
git rev-parse HEAD
git describe --tags --exact-match

# Safety
git status --porcelain

# Strict "src untouched" proof (must be empty)
git diff --name-only -- src
