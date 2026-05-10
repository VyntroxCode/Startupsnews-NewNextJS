#!/usr/bin/env bash
# deploy.sh — Production deployment script for zox-nextjs
# Usage: bash deploy.sh
set -euo pipefail

APP_DIR="/home/ubuntu/zox-nextjs"
APP_NAME="zox-web"
PORT=3000

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

cd "$APP_DIR"

# ── 1. Kill ALL orphaned next-server processes not owned by PM2 ───────────────
PM2_PIDS=$(pm2 jlist 2>/dev/null | python3 -c \
  "import sys,json; procs=json.load(sys.stdin); [print(p['pid']) for p in procs]" 2>/dev/null || true)

# Kill every next-server process that PM2 doesn't own
while IFS= read -r pid; do
  [[ -z "$pid" ]] && continue
  if ! echo "$PM2_PIDS" | grep -q "^${pid}$"; then
    log "Killing orphaned next-server PID $pid"
    kill "$pid" 2>/dev/null || true
  fi
done < <(pgrep -f "next-server" || true)

# Also kill anything still holding the port
while IFS= read -r pid; do
  [[ -z "$pid" ]] && continue
  if ! echo "$PM2_PIDS" | grep -q "^${pid}$"; then
    log "Killing process $pid still holding port $PORT"
    kill "$pid" 2>/dev/null || true
  fi
done < <(ss -tlnp "sport = :$PORT" 2>/dev/null | grep -oP 'pid=\K[0-9]+' || true)

sleep 2

# ── 2. Install dependencies ────────────────────────────────────────────────────
log "Installing dependencies..."
npm ci --prefer-offline --loglevel=warn

# ── 3. Build ───────────────────────────────────────────────────────────────────
log "Building Next.js..."
npm run build

# ── 4. Reload or start via PM2 ────────────────────────────────────────────────
log "Reloading PM2 app: $APP_NAME..."
if pm2 describe "$APP_NAME" &>/dev/null; then
  pm2 reload ecosystem.config.js --only "$APP_NAME"
else
  pm2 start ecosystem.config.js --only "$APP_NAME"
fi

# ── 5. Wait for the server to be ready ────────────────────────────────────────
log "Waiting for server on port $PORT..."
for i in $(seq 1 20); do
  if curl -sf "http://localhost:$PORT/api/health" -o /dev/null; then
    log "Server is up and healthy."
    break
  fi
  sleep 2
  if [[ $i -eq 20 ]]; then
    log "ERROR: Server did not become healthy after 40s."
    pm2 logs "$APP_NAME" --lines 30 --nostream
    exit 1
  fi
done

# ── 6. Persist PM2 process list ───────────────────────────────────────────────
pm2 save
log "Deployment complete."
