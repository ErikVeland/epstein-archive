# Runbook: AI Provider Timeout / Failure

**Severity:** P2
**Detection:** AI enrichment jobs failing, LLM response latency > 30s, or provider HTTP 429/503 errors

## Immediate Triage

1. **Identify failing AI artifact writes**

   ```sql
   SELECT id, job_type, error_message, attempt_count, updated_at
   FROM pipeline_jobs
   WHERE status = 'dead_letter' AND job_type LIKE '%ai%' OR job_type LIKE '%intelligence%'
   ORDER BY updated_at DESC LIMIT 20;
   ```

2. **Check provider status**
   - OpenAI status: https://status.openai.com
   - Anthropic status: https://status.anthropic.com
   - Check API key expiry: `echo $OPENAI_API_KEY | cut -c1-8`

3. **Fallback mode**

   ```bash
   # Disable AI stage in pipeline
   ALLOW_AI_CONTENT_REWRITE=false pnpm pipeline:ingest

   # Or skip intelligence stage entirely
   pnpm pipeline:ingest --skip intelligence
   ```

## Mitigation

1. **Reduce concurrency**

   ```env
   AI_CONCURRENCY=1
   QUEUE_MAX_ATTEMPTS=3
   AI_TIMEOUT_MS=60000
   ```

2. **Switch provider** (if multi-provider configured)

   ```env
   AI_PROVIDER=anthropic    # or openai
   ```

3. **Bypass AI for pending jobs**
   ```sql
   -- Mark AI jobs as skipped (data will be enriched in next maintenance window)
   UPDATE pipeline_jobs SET status = 'skipped', updated_at = NOW()
   WHERE status = 'pending' AND job_type LIKE '%ai%';
   ```

## Root Cause Investigation

1. **Check API response times**

   ```bash
   curl -w "Connect: %{time_connect}s, TTFB: %{time_starttransfer}s, Total: %{time_total}s" \
     -X POST https://api.openai.com/v1/chat/completions \
     -H "Authorization: Bearer $OPENAI_API_KEY" \
     -d '{"model":"gpt-4","messages":[{"role":"user","content":"ping"}]}'
   ```

2. **Check rate limit headers**

   ```bash
   curl -sI -X POST https://api.openai.com/v1/chat/completions \
     -H "Authorization: Bearer $OPENAI_API_KEY" | grep -i ratelimit
   ```

3. **Check app logs for provider errors**
   ```bash
   grep -i 'openai\|anthropic\|llm\|ai.*error\|ai.*timeout' /var/log/app/error.log
   ```

## Resolution

- Increase timeout: `AI_TIMEOUT_MS=120000`
- Increase retry: `QUEUE_MAX_ATTEMPTS=5`
- Add exponential backoff in `scripts/ingest_intelligence.ts`
- If persistent, disable AI enrichment and run as offline maintenance batch
- Fall back to deterministic entity extraction (no LLM)

## Post-Mortem

- Update AI provider SLAs in documentation
- Add circuit breaker for provider in `scripts/ingest_intelligence.ts`
- Consider adding a fallback provider or local model
