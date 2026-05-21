# Runbook: Search Latency Spike

**Severity:** P1/P2
**Detection:** p95 search latency > 2s, Datadog/Grafana alert, or user reports of slow search

## Immediate Triage

1. **Identify affected endpoints**
   - Check `GET /api/search` and `GET /api/documents` p50/p95/p99
   - Look for N+1 query patterns via `queryCounter` budgets
   - Check if `semantic` or `hybrid` search mode is spiking (pgvector)

2. **Check DB health**

   ```sql
   SELECT wait_event, wait_event_type, state, query
   FROM pg_stat_activity
   WHERE state != 'idle' AND query NOT LIKE '%pg_stat%';
   ```

   - Look for long-running `websearch_to_tsquery` or pgvector queries
   - Check `pg_stat_user_tables` for sequential scans on `documents` or `entities`

3. **Mitigation**
   - Rate-limit the offending endpoint via `searchRoutes` limiter (reduce `apiRateLimiter` cap)
   - Force lexical-only mode: set `SEARCH_MODE_FORCE_LEXICAL=1` env var
   - Block semantic search temporarily: `REVOKE USAGE ON SCHEMA vectors FROM api_user;`

## Root Cause Investigation

1. **Check query plan regression**
   ```
   tsx scripts/check_query_plan.ts
   ```
2. **Check for missing indexes**
   ```sql
   SELECT schemaname, tablename, indexname, indexdef
   FROM pg_indexes
   WHERE tablename IN ('documents', 'entities');
   ```
3. **Check pgvector index health**
   ```sql
   SELECT indexname, idx_scan, idx_tup_read, idx_tup_fetch
   FROM pg_stat_user_indexes
   WHERE indexname LIKE '%vector%';
   ```

## Resolution

- Add or recreate GIN/GIST/IVFFLAT indexes
- Raise `work_mem` for the search session
- Add a negative cache for common empty searches
- If pgvector: reduce `probes` parameter or rebuild HNSW index

## Post-Mortem

- Update `QUERY_BUDGETS` in `queryCounter.ts` if baseline changed
- Add regression query to `pg_explain.ts`
- Escalate to Data Platform team if index maintenance is required
