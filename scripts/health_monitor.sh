#!/bin/bash
# health_monitor.sh
# Checks if the Epstein Archive API is responsive and restarts it via PM2 if not.
# Also verifies public Glasscode sites without restarting unrelated services.

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
URL="http://127.0.0.1:3012/api/health"
READY_URL="http://127.0.0.1:3012/api/health/ready"
LOG_FILE="${HEALTH_MONITOR_LOG_FILE:-$APP_ROOT/logs/health_monitor.log}"
LOCK_FILE="/tmp/health_monitor.lock"
PM2_NAME="${PM2_NAME:-epstein-archive}"
TIMEOUT=10

# Lockfile protection
if [ -e "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE")
    if ps -p "$PID" > /dev/null; then
        # Check if the process has been running for a long time (e.g., more than 10 mins)
        # This prevents a stale lock from blocking the monitor indefinitely
        echo "$(date '+%Y-%m-%d %H:%M:%S') - WARNING: health_monitor.sh already running with PID $PID. Skipping." >> "$LOG_FILE"
        exit 0
    fi
fi
echo $$ > "$LOCK_FILE"

# Clean up lockfile on exit
trap 'rm -f "$LOCK_FILE"' EXIT

log_msg() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

check_health() {
    local target_url=$1
    local name=$2

    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$target_url")
    if [ "$RESPONSE" != "200" ]; then
        log_msg "CRITICAL: $name check failed with status $RESPONSE for $target_url"
        return 1
    fi
    return 0
}

# Ensure log file directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Perform checks
HEALTH_OK=0
check_health "$URL" "API Liveness" || HEALTH_OK=1
if [ $HEALTH_OK -eq 0 ]; then
    check_health "$READY_URL" "API Readiness (DB)" || HEALTH_OK=1
fi

if [ $HEALTH_OK -ne 0 ]; then
    log_msg "ACTION: Attempting PM2 restart for $PM2_NAME..."
    
    # Try graceful restart first
    pm2 restart "$PM2_NAME" >> "$LOG_FILE" 2>&1
    
    sleep 15
    
    # Final verification
    if check_health "$URL" "API Recovery Verification"; then
        log_msg "SUCCESS: Service recovered after restart."
    else
        log_msg "ERROR: Service FAILED to recover after restart. Sending hard kill signal..."
        # Last resort: Force kill and start
        pm2 stop "$PM2_NAME" >> "$LOG_FILE" 2>&1
        fuser -k 3012/tcp >> "$LOG_FILE" 2>&1
        pm2 start "$PM2_NAME" >> "$LOG_FILE" 2>&1
        log_msg "INFO: Hard restart commanded."
    fi
else
    # Always log if VERBOSE is set or if it's the top of the hour
    if [ -n "${VERBOSE:-}" ] || [ $(( ( $(date +%s) / 60 ) % 60 )) -eq 0 ]; then
        log_msg "PASS: Health checks passed."
    fi
fi

if "$SCRIPT_DIR/check_public_sites.sh" >> "$LOG_FILE" 2>&1; then
    log_msg "PASS: Public Glasscode site checks passed."
else
    log_msg "CRITICAL: Public Glasscode site checks failed. Review immediately."
fi
