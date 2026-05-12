#!/bin/bash
# scripts/ops/harden_linux_stack.sh
# AUDIT & HARDENING VERIFIER FOR HOSTING SERVICES
# 
# This is non-destructive by default. Run with --apply to inject modifications.

set -euo pipefail

MODE="${1:-audit}"

log_msg() {
    echo ">>> [HARDENER] $1"
}

assert_linux() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        return 0
    else
        log_msg "WARNING: Current OS is not standard GNU Linux. Hardener might lack coverage."
        return 1
    fi
}

# 1. POSTGRES OOM PROTECTION
# We configure the kernel to spare Postgres if an out-of-memory event occurs.
# It should prioritize killing background workers (Node) before DB processes.
oom_audit() {
    log_msg "PHASE 1: POSTGRES OOM VERIFICATION"
    if ! assert_linux; then return 0; fi
    
    local pg_pid
    pg_pid=$(pidof postgres | awk '{print $1}' || echo "")
    
    if [ -n "$pg_pid" ]; then
        local score
        score=$(cat "/proc/$pg_pid/oom_score_adj" 2>/dev/null || echo "unknown")
        log_msg "Current Postgres OOM Score: $score"
        if [ "$score" == "-900" ]; then
            log_msg "[PASS] Postgres is sufficiently shielded from OOM Killer."
        else
            log_msg "[WARN] Postgres is exposed. Target score is -900."
            if [ "$MODE" == "--apply" ]; then
                log_msg "ACTION: Attempting to enforce Postgres OOM protection systemd override."
                sudo mkdir -p /etc/systemd/system/postgresql.service.d/
                echo -e "[Service]\nOOMScoreAdjust=-900" | sudo tee /etc/systemd/system/postgresql.service.d/oom-protect.conf > /dev/null
                sudo systemctl daemon-reload
                log_msg "[SUCCESS] Applied. Requires Postgres systemd restart to fully take effect."
            fi
        fi
    else
        log_msg "[SKIP] No running Postgres PID found locally."
    fi
}

# 2. NGINX RATE LIMITING VISIBILITY
nginx_audit() {
    log_msg "PHASE 2: NGINX RATE LIMIT COMPLIANCE"
    if ! command -v nginx >/dev/null 2>&1; then
        log_msg "[SKIP] Nginx not found locally."
        return 0
    fi

    # Look for limit_req references in generic nginx configuration locations
    if grep -rq "limit_req_zone" /etc/nginx 2>/dev/null; then
        log_msg "[PASS] Edge rate limiting zone defined in Nginx."
    else
        log_msg "[FAIL] No globally defined limit_req_zone found in /etc/nginx/."
        log_msg "RECOMMENDATION: Add 'limit_req_zone \$binary_remote_addr zone=mylimit:10m rate=20r/s;' to nginx.conf."
    fi
}

# 3. UFW (FIREWALL) CHECK
firewall_audit() {
    log_msg "PHASE 3: FIREWALL TIGHTENING"
    if command -v ufw >/dev/null 2>&1; then
        local status
        status=$(sudo ufw status | head -n 1 | awk '{print $2}' || echo "inactive")
        if [ "$status" == "active" ]; then
            log_msg "[PASS] UFW firewall is operational."
        else
            log_msg "[WARN] UFW is inactive."
        fi
    else
        log_msg "[SKIP] UFW command unavailable."
    fi
}

# ==========================================
# EXECUTE
# ==========================================

log_msg "Commencing operational system audit..."
oom_audit
nginx_audit
firewall_audit

log_msg "Stack auditing finished."
