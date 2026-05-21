# Runbook: Ingest Queue Stuck

**Severity:** P1
**Detection:** Pipeline heartbeat missing, no new documents ingested > 30m, or dead-letter queue growing

## Immediate Triage

1. **Check pipeline health**

   ```bash
   pm2 list                              # verify process running
   pm2 logs pipeline --lines 50          # check recent output
   curl -s http://localhost:3012/api/health/ready | jq .
   ```

2. **Check pipeline_jobs table**

   ```sql
   SELECT status, COUNT(*) FROM pipeline_jobs GROUP BY status;
   SELECT * FROM pipeline_jobs WHERE status = 'running' AND updated_at < NOW() - INTERVAL '1 hour';
   ```

   - If stuck `running` jobs, check for stale leases

3. **Run recovery**
   ```bash
   pnpm pipeline:backfill                  # replay failed/abandoned jobs
   tsx scripts/ingest/queue_worker.ts      # manually trigger worker cycle
   ```

## Stale Lease Recovery

1. **Identify stale leases**

   ```sql
   SELECT id, job_type, status, lease_id, updated_at, attempt_count
   FROM pipeline_jobs
   WHERE status = 'running' AND updated_at < NOW() - INTERVAL '30 minutes';
   ```

2. **Force release stale leases**
   - The stale-lease reaper runs automatically on a 2-minute cycle
   - If it is not running, restart the pipeline: `pm2 restart pipeline`
   - Manual recovery: update to `pending` state
   ```sql
   UPDATE pipeline_jobs SET status = 'pending', lease_id = NULL, updated_at = NOW()
   WHERE status = 'running' AND updated_at < NOW() - INTERVAL '30 minutes';
   ```

## Dead-Letter Recovery

1. **Inspect dead letters**

   ```sql
   SELECT id, job_type, error_message, attempt_count, created_at
   FROM pipeline_jobs
   WHERE status = 'dead_letter'
   ORDER BY created_at DESC
   LIMIT 20;
   ```

2. **Requeue dead letters**
   ```bash
   tsx src/server/services/JobManager.ts --requeue-dead-letters
   ```
   Or via SQL:
   ```sql
   UPDATE pipeline_jobs SET status = 'pending', lease_id = NULL, attempt_count = 0, updated_at = NOW()
   WHERE status = 'dead_letter' AND attempt_count < 5;
   ```

## Root Causes

| Symptom                                    | Likely Cause                            | Fix                                    |
| ------------------------------------------ | --------------------------------------- | -------------------------------------- |
| Jobs stuck `running`                       | Process crashed without releasing lease | Stale lease reaper                     |
| All jobs `dead_letter`                     | Corrupt source file or schema change    | Fix source, migrate schema, requeue    |
| Empty `pipeline_jobs` but pipeline running | Job producer crashed                    | Check `scripts/ingest/queue_worker.ts` |
| DB connection errors                       | Pool exhausted or DB down               | Check `pg_saturation_shed` logs        |

## Escalation

- If queue backlog exceeds 10k jobs, notify Data Platform
- If dead-letter rate > 5%, pause pipeline and investigate source data integrity
