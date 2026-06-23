#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${1:-$ROOT/infra/resourcespace-staging/resourcespace-docker}"

mkdir -p "$(dirname "$TARGET")"

if [ ! -d "$TARGET/.git" ]; then
  git clone --depth 1 https://github.com/resourcespace/docker.git "$TARGET"
else
  git -C "$TARGET" fetch --depth 1 origin main
  git -C "$TARGET" reset --hard origin/main
fi

echo "Official ResourceSpace Docker repo ready at $TARGET"
