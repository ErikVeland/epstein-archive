#!/bin/bash
set -e

# Configuration
URL="${DEPLOY_VERIFY_URL:-http://127.0.0.1:3012}"
EXPECTED_VERSION=$(node -e "console.log(JSON.parse(require('fs').readFileSync('./package.json','utf8')).version)")

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

echo "Verifying deployment at $URL..."

# 1. Check Deep Readiness
echo "Checking /api/health/ready..."
READY_RESPONSE=$(curl -sS --max-time 60 -w " HTTP_STATUS:%{http_code}" "$URL/api/health/ready")
READY_STATUS="${READY_RESPONSE##*HTTP_STATUS:}"
READY_BODY="${READY_RESPONSE% HTTP_STATUS:*}"
if [ "$READY_STATUS" == "200" ] && echo "$READY_BODY" | grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"'; then
    log_success "Readiness Check OK (200 + status=ok)"
else
    log_error "Readiness Check FAILED ($READY_STATUS): $READY_BODY"
    exit 1
fi

# 1b. Check deep health endpoint
echo "Checking /api/stats/health/deep..."
DEEP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/api/stats/health/deep")
if [ "$DEEP_STATUS" == "200" ]; then
    log_success "Deep Health Check OK (200)"
else
    log_error "Deep Health Check FAILED ($DEEP_STATUS)"
    exit 1
fi

# 2. Check Auth Scoping (/api/auth/me)
echo "Checking /api/auth/me (Auth Scoping Fix)..."
AUTH_ME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/api/auth/me")
if [ "$AUTH_ME_STATUS" == "200" ]; then
    log_success "Auth Scoping Verified (200)"
else
    log_error "Auth Scoping FAILED ($AUTH_ME_STATUS) - Still blocked by middleware?"
    exit 1
fi

# 3. Check Media Read Access (/api/media/images) - public
echo "Checking /api/media/images (Public Read Access)..."
MEDIA_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/api/media/images?limit=1&slim=true")
if [ "$MEDIA_STATUS" == "200" ]; then
    log_success "Media API Public Access Verified (200)"
else
    log_error "Media API Public Access FAILED (Expected 200, got $MEDIA_STATUS)"
    exit 1
fi

# 4. Check Stats (DB Connectivity)
echo "Checking /api/stats (Database Connectivity)..."
STATS_JSON=$(curl -s "$URL/api/stats")
TOTAL_ENTITIES=$(echo "$STATS_JSON" | grep -o '"totalEntities":[0-9]*' | cut -d: -f2)

if [ -n "$TOTAL_ENTITIES" ] && [ "$TOTAL_ENTITIES" -gt 0 ]; then
    log_success "Stats Verified (Total Entities: $TOTAL_ENTITIES)"
else
    log_error "Stats Verification FAILED (Empty or zero entities): $STATS_JSON"
    exit 1
fi

# 5. Check Subject Listings (/api/subjects) - public + required
echo "Checking /api/subjects (Public Access)..."
SUBJECTS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/api/subjects?page=1&limit=24")
if [ "$SUBJECTS_STATUS" == "200" ]; then
   log_success "Subject Listing API Public Access Verified (200)"
else
   log_error "Subject Listing API FAILED (Expected 200, got $SUBJECTS_STATUS)"
   exit 1
fi

# 5b. Check Entity Listings (/api/entities) returns JSON (not SPA HTML fallback)
echo "Checking /api/entities (Public JSON Access)..."
ENTITIES_RESPONSE=$(curl -sS --max-time 60 -w " HTTP_STATUS:%{http_code}" "$URL/api/entities?page=1&limit=1")
ENTITIES_STATUS="${ENTITIES_RESPONSE##*HTTP_STATUS:}"
ENTITIES_BODY="${ENTITIES_RESPONSE% HTTP_STATUS:*}"
if [ "$ENTITIES_STATUS" != "200" ]; then
    log_error "Entity Listing API FAILED (Expected 200, got $ENTITIES_STATUS)"
    exit 1
fi
if echo "$ENTITIES_BODY" | grep -qi '<!doctype html'; then
    log_error "Entity Listing API returned HTML fallback instead of JSON."
    exit 1
fi
if echo "$ENTITIES_BODY" | grep -Eq '"data"[[:space:]]*:'; then
    log_success "Entity Listing API JSON Verified (200)"
else
    log_error "Entity Listing API JSON payload missing expected 'data' field."
    exit 1
fi

# 6. Check Main Page
echo "Checking Main Page Load..."
MAIN_PAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
if [ "$MAIN_PAGE_STATUS" == "200" ]; then
    log_success "Main Page Load OK (200)"
else
    log_error "Main Page Load FAILED ($MAIN_PAGE_STATUS)"
    exit 1
fi

# 8. Check Document Loading (Public Data + Detail Fetch)
echo "Checking /api/documents (Loading Verification)..."
DOCS_RESPONSE=$(curl -sS --max-time 60 -w " HTTP_STATUS:%{http_code}" "$URL/api/documents?limit=1")
DOCS_STATUS="${DOCS_RESPONSE##*HTTP_STATUS:}"
DOCS_JSON="${DOCS_RESPONSE% HTTP_STATUS:*}"
if [ "$DOCS_STATUS" != "200" ]; then
    log_error "Documents API Access FAILED (Expected 200, got $DOCS_STATUS): $DOCS_JSON"
    exit 1
fi

FIRST_DOC_ID=$(echo "$DOCS_JSON" | grep -o '"id":"\{0,1\}[0-9]\+' | head -1 | grep -o '[0-9]\+')
if [ -z "$FIRST_DOC_ID" ]; then
    log_error "Documents API returned no parsable document id; payload was: $DOCS_JSON"
    exit 1
fi

DOC_DETAIL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/api/documents/$FIRST_DOC_ID")
if [ "$DOC_DETAIL_STATUS" == "200" ]; then
    log_success "Document Detail API Verified (id=$FIRST_DOC_ID)"
else
    log_error "Document Detail API FAILED for id=$FIRST_DOC_ID (status=$DOC_DETAIL_STATUS)"
    exit 1
fi

# 9. Burst check to ensure immediate limiter lockout is not happening (on public endpoint)
echo "Checking /api/stats burst resilience..."
for i in 1 2 3 4 5; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/api/stats")
  if [ "$STATUS" != "200" ]; then
    log_error "Stats burst check failed on request $i (status=$STATUS)"
    exit 1
  fi
done
log_success "Stats burst resilience OK"

echo "Checking public Glasscode services..."
./scripts/check_public_sites.sh

echo "---"
echo -e "${GREEN}ALL CHECKS PASSED. DEPLOYMENT v$EXPECTED_VERSION VERIFIED.${NC}"
exit 0
