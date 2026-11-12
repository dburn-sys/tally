#!/usr/bin/env sh
# Pin every FROM line in the Dockerfile to its current digest (architecture rule E-1).
# Needs Docker with access to the registry. Run it, review the diff, commit.
set -eu
file="${1:-Dockerfile}"
for image in $(grep -E '^FROM ' "$file" | awk '{print $2}' | grep -v '@sha256:' | sort -u); do
  digest=$(docker buildx imagetools inspect "$image" --format '{{json .Manifest}}' | sed -E 's/.*"digest":"([^"]+)".*/\1/')
  case "$digest" in sha256:*) ;; *) echo "couldn't resolve $image" >&2; exit 1 ;; esac
  sed -i.bak "s|^FROM $image|FROM $image@$digest|" "$file" && rm -f "$file.bak"
  echo "pinned $image -> $digest"
done
