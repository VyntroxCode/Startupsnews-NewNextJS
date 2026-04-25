#!/bin/bash
# Install cron to run RSS feed fetch every 10 minutes.
# Usage: ./scripts/install-rss-cron.sh
# Uses wrapper script so cron has correct PATH and cwd.

set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$DIR/logs"
LOGFILE="$DIR/logs/rss-cron.log"
WRAPPER="$DIR/scripts/run-rss-cron.sh"
chmod +x "$WRAPPER" 2>/dev/null || true

# Use wrapper script (sets PATH, cd, then runs tsx)
ENTRY="*/10 * * * * $WRAPPER >> $LOGFILE 2>&1"

# Remove any old RSS cron lines (varies over time)
crontab -l 2>/dev/null | grep -v 'cron-fetch-rss-feeds' | grep -v 'run-rss-cron' | crontab - 2>/dev/null || true

if ! crontab -l 2>/dev/null | grep -q 'run-rss-cron'; then
  (crontab -l 2>/dev/null; echo "$ENTRY") | crontab -
  echo "Installed: RSS cron every 10 minutes (log: $LOGFILE)"
  echo "To use system cron instead: sudo cp $DIR/scripts/cron.d-zox-rss.txt /etc/cron.d/zox-rss"
else
  echo "RSS cron entry already present (log: $LOGFILE)."
fi
