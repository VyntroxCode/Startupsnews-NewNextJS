#!/bin/bash
# Wrapper for RSS cron (scheduler + queue). Run every 10 min from crontab.
# RUN_ONCE=1: run scheduler once, wait for queue drain, then exit.
# Loads .env.local so DB, Redis, JWT_SECRET etc. are available when cron runs.

set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
export NODE_ENV="${NODE_ENV:-production}"
export RUN_ONCE="${RUN_ONCE:-1}"
cd "$DIR"

# Load env from .env.local so cron has DB, REDIS_URL, etc.
if [ -f "$DIR/.env.local" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$DIR/.env.local"
  set +a
fi

# Cron path doesn't use JWT; env validation requires it in production. Set placeholder if missing.
if [ -z "$JWT_SECRET" ]; then
  export JWT_SECRET="cron-rss-internal-no-auth"
fi

# Ensure RSS cron and processing are enabled when this script runs (override production defaults).
export ENABLE_CRON=1
export ENABLE_RSS_PROCESSING=1
export ENABLE_IMAGE_DOWNLOAD=1

exec npx tsx cron/index.ts
