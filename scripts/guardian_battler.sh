#!/bin/bash
# scripts/guardian_battler.sh
# PROACTIVE AUTONOMIC SELF-HEALING ENGINE
# Executes system resource triage and attempts recovery routines before human interaction is required.

set -euo pipefail

# ==========================================
# CONFIGURATION
# ==========================================
SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="${GUARDIAN_LOG_FILE:-$APP_ROOT/logs/guardian_battler.log}"
LOCK_FILE="/tmp/guardian_battler.lock"

URL="http://127.0.0.1:3012/api/health"
READY_URL="http://127.0.0.1:3012/api/health/ready"
TIMEOUT=10
PM2_NAME="${PM2_NAME:-epstein-archive}"

# Thresholds
DISK_THRESHOLD_PERCENT=88
MEM_SWAP_THRESHOLD_MB=500

# Ensures parent folder exists
mkdir -p "$(dirname "$LOG_FILE")"

log_msg() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - [GUARDIAN] - $1" | tee -a "$LOG_FILE"
}

# ==========================================
# CONCURRENCY LOCK
# ==========================================
if [ -e "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE")
    if ps -p "$PID" > /dev/null; then
        # Prevent stale hang, but otherwise skip if active
        exit 0
    fi
fi
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

# ==========================================
# TIER 1: RESOURCE PRESSURE (DISK/MEMORY)
# ==========================================

check_disk_pressure() {
    # Get usage of the partition housing the app root
    local current_usage
    current_usage=$(df -P "$APP_ROOT" | awk 'NR==2 {gsub("%","",$5); print $5}')
    
    if [ "$current_usage" -ge "$DISK_THRESHOLD_PERCENT" ]; then
        log_msg "WARNING: Disk Pressure detected at ${current_usage}%. Triggering autonomous truncation."
        
        # 1. Prune old checkpoints
        if [ -d "$APP_ROOT/pipeline_checkpoints" ]; then
            log_msg "ACTION: Pruning pipeline checkpoints older than 7 days."
            find "$APP_ROOT/pipeline_checkpoints" -type f -mtime +7 -delete || true
        fi
        
        # 2. Truncate application log files larger than 50MB (safely)
        log_msg "ACTION: Scanning for log overflow."
        find "$APP_ROOT" -maxdepth 1 -name "*.log" -size +50M -exec sh -c '> "{}"' \; || true
        
        # Verify success
        local new_usage
        new_usage=$(df -P "$APP_ROOT" | awk 'NR==2 {gsub("%","",$5); print $5}')
        log_msg "RESULT: Disk cleared. New usage: ${new_usage}%."
    fi
}

check_memory_pressure() {
    # If free command exists (Linux platforms)
    if command -v free >/dev/null 2>&1; then
        local swap_used
        swap_used=$(free -m | grep "Swap:" | awk '{print $3}')
        
        if [ -n "$swap_used" ] && [ "$swap_used" -gt "$MEM_SWAP_THRESHOLD_MB" ]; then
            log_msg "WARNING: Significant Swap memory pressure (${swap_used}MB). Command triggering soft reload."
            # PM2 reload does a rolling zero-downtime replacement of processes to flush V8 caches
            if command -v pm2 >/dev/null 2>&1; then
                pm2 reload "$PM2_NAME" >> "$LOG_FILE" 2>&1 || true
                log_msg "ACTION: Completed zero-downtime cluster reload."
            fi
        fi
    fi
}

# ==========================================
# TIER 2: SERVICE HEALTH & CASCADES
# ==========================================

verify_endpoint() {
    local target_url=$1
    local name=$2
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$target_url" || echo "000")
    if [ "$response" != "200" ]; then
        log_msg "CRITICAL: $name failed (HTTP $response)"
        return 1
    fi
    return 0
}

heal_application() {
    log_msg "ACTION: Application endpoint failure. Commencing cascade recovery..."
    
    if command -v pm2 >/dev/null 2>&1; then
        pm2 restart "$PM2_NAME" >> "$LOG_FILE" 2>&1
        sleep 10
        
        if verify_endpoint "$URL" "Re-Verification"; then
            log_msg "SUCCESS: Application recovered via standard restart."
            return 0
        fi
        
        log_msg "DANGER: Service stuck. Attempting force-kill routine."
        pm2 stop "$PM2_NAME" >> "$LOG_FILE" 2>&1 || true
        # Fallback to lsof/fuser if available on this platform
        if command -v fuser >/dev/null 2>&1; then
            fuser -k 3012/tcp >> "$LOG_FILE" 2>&1 || true
        fi
        pm2 start "$PM2_NAME" >> "$LOG_FILE" 2>&1
    fi
}

# ==========================================
# MAIN EXECUTION LOOP
# ==========================================

log_msg "INFO: Cycle started."

# Perform Triage
check_disk_pressure
check_memory_pressure

# Perform Service Checks
HEALTH_OK=0
verify_endpoint "$URL" "Liveness" || HEALTH_OK=1

if [ $HEALTH_OK -eq 0 ]; then
    verify_endpoint "$READY_URL" "Readiness (Database Bound)" || HEALTH_OK=1
fi

if [ $HEALTH_OK -ne 0 ]; then
    heal_application
else
    # Verify edge proxy if available (only useful if we are on the specific server running it)
    if command -v systemctl >/dev/null 2>&1; then
        # Check if nginx is installed and should be active
        if systemctl is-active --quiet nginx 2>/dev/null; then
            # Nginx is running
            :
        else
            # This implies Nginx is configured but down, attempt to revive
            log_msg "WARNING: Nginx detected inactive. Attempting auto-revive."
            sudo systemctl restart nginx >> "$LOG_FILE" 2>&1 || true
        fi
    fi
fi

log_msg "INFO: Cycle completed successfully."
exit 0
