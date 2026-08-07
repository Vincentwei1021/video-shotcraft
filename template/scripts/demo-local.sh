#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$TEMPLATE_DIR"

if [[ ! -f private/props.json ]]; then
  printf 'Missing required private props: %s/private/props.json\n' "$TEMPLATE_DIR" >&2
  exit 1
fi

npm install
npm run validate:henry
npm run typecheck
npm run still:henry
npm run render:henry
