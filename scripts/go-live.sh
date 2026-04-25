#!/bin/bash
# Get the site live: nginx + Next.js on 3000
# Run from project root: ./scripts/go-live.sh
# Or: bash /home/ubuntu/zox-nextjs/scripts/go-live.sh

set -e
cd "$(dirname "$0")/.."
APP_DIR="$(pwd)"

echo "=== StartupNews go-live ==="

# 1. Nginx: ensure config is in place
if [ ! -f /etc/nginx/sites-available/startupnews ]; then
  echo "Installing nginx config..."
  sudo cp /home/ubuntu/startupnews-nginx.conf /etc/nginx/sites-available/startupnews
  sudo ln -sf /etc/nginx/sites-available/startupnews /etc/nginx/sites-enabled/startupnews
  sudo nginx -t && sudo systemctl reload nginx
  echo "Nginx config installed and reloaded."
else
  echo "Nginx config already present."
  sudo nginx -t && sudo systemctl reload nginx || true
fi

# 2. Env
if [ ! -f .env.local ]; then
  echo "WARNING: .env.local not found. Create it with DB_*, REDIS_*, etc. Copy from .env.example if needed."
  exit 1
fi

# 3. Build
echo "Building Next.js app..."
npm run build

# 4. Start app (choose one)

# Option A: systemd (recommended for production)
if [ -f /etc/systemd/system/startupnews.service ]; then
  echo "Starting via systemd..."
  sudo systemctl daemon-reload
  sudo systemctl restart startupnews
  sudo systemctl enable startupnews 2>/dev/null || true
  echo "App started. Check: sudo systemctl status startupnews"
else
  # Option B: run in background with nohup (fallback)
  echo "No systemd unit found. Starting with nohup on port 3000..."
  (cd "$APP_DIR" && nohup npm run start > start.log 2>&1 &)
  echo "App starting in background. Logs: tail -f $APP_DIR/start.log"
  echo "To install systemd for auto-restart: sudo cp $APP_DIR/scripts/startupnews.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now startupnews"
fi

echo ""
echo "=== Done ==="
echo "Site should be available at http://startupnews.thebackend.in (or your domain)."
echo "If you see 502: wait 30s for the app to start, or run: journalctl -u startupnews -n 50"
