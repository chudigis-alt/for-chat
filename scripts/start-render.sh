#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Both operations are repeatable and preserve existing orders and accounts.
npm run db:migrate
npm run db:seed
exec node node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port "${PORT:-10000}"
