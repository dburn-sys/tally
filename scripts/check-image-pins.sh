#!/usr/bin/env sh
# Fail if any FROM line isn't pinned by digest (architecture rule E-1). Used by CI.
set -eu
unpinned=$(grep -nE '^FROM ' "${1:-Dockerfile}" | grep -v '@sha256:' || true)
if [ -n "$unpinned" ]; then
  echo "Base images not pinned by digest (run scripts/pin-images.sh):"
  echo "$unpinned"
  exit 1
fi
echo "All base images pinned by digest."
