# Runbook: Cache Stale Data Incident

**Severity:** P2
**Detection:** Users seeing inconsistent data, stale counts, or data that does not reflect recent mutations

## Immediate Triage

1. **Identify affected data**
   - Which endpoint/cache namespace is serving stale data?
   - Check cache headers in response:

   ```bash
   curl -sI https://archive.example.com/api/documents | grep -i cache
   ```

2. **Invalidate the cache namespace**

   ```typescript
   // Via server-side cache service
   cacheService.flush('http'); // HTTP response cache
   cacheService.flush('query'); // DB query cache
   cacheService.flush('search'); // Search result cache
   ```

3. **Force a cold read for the affected endpoint**
   - Add `?nocache=1` query parameter if supported
   - Or restart the PM2 process: `pm2 restart api`
   - Or touch the data to trigger invalidation:
   ```bash
   # Touch the source file to bump mtime
   touch data/<affected-file>
   ```

## Root Cause Investigation

1. **Check cache key pattern**

   ```typescript
   // Look for cache keys that don't include revision tokens
   grep -n 'cacheService\.(get|set)' src/server/
   ```

2. **Check cache invalidation triggers**

   ```typescript
   // Verify that mutations call cacheService.del() with correct patterns
   grep -rn 'purgeCacheByPattern\|cacheService\.del\|cacheService\.flush' src/server/
   ```

3. **Check TTL configuration**
   - Is the TTL too long for the data type?
   - Does the endpoint have `cacheResponse()` with an excessive TTL?

## Common Causes

| Pattern                 | Cause                                             | Fix                              |
| ----------------------- | ------------------------------------------------- | -------------------------------- |
| List stale after create | Invalidation pattern doesn't match list cache key | Fix `purgeCacheByPattern` regex  |
| Counts stale            | Count query cached too long                       | Reduce TTL or exclude from cache |
| Cross-user stale        | Cache not partitioned by user scope               | Add user ID to cache key         |
| Schema change stale     | Cache key doesn't include schema hash             | Add `revisionToken` to key       |

## Prevention

1. **Every mutation route must invalidate related caches**
   - Already enforced in `app.ts` (post-write cache purge middleware)
   - Verify new routes are registered in the purge middleware

2. **Audit cache TTLs quarterly**

   ```bash
   grep -rn 'cacheResponse\|cacheService\.set' src/server/ | grep -v test
   ```

3. **Add cache hit ratio monitoring**
   ```typescript
   // TODO: Add to metrics pipeline
   cacheService.getMetrics();
   ```

## Escalation

- If stale data is visible to anonymous users, consider emergency cache flush via admin endpoint
- If cache thrashing (low hit rate, high write rate), disable caching for the affected endpoint
