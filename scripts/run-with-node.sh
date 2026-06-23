#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .nvmrc ]; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "$NVM_DIR/nvm.sh"
    nvm use --silent
  fi
fi

major="$(node -p "parseInt(process.versions.node.split('.')[0], 10)")"
if [ "$major" -lt 20 ]; then
  echo "Node.js 20+ required (current: $(node -v))." >&2
  echo "Run: nvm install && nvm use" >&2
  exit 1
fi

exec "$@"
