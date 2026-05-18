/* @name createJob */
INSERT INTO processing_jobs (run_id, step_name, target_type, target_id)
VALUES (:runId!, :stepName!, :targetType!, :targetId!)
RETURNING id;

/* @name listJobs */
SELECT
  id,
  run_id,
  step_name,
  target_type,
  target_id,
  status,
  attempts,
  max_attempts,
  locked_by,
  locked_at,
  last_error,
  created_at,
  updated_at
FROM processing_jobs 
WHERE (:status::text IS NULL OR status = :status)
  AND (:targetType::text IS NULL OR target_type = :targetType)
ORDER BY priority DESC, created_at ASC;

/* @name updateJobStatus */
UPDATE processing_jobs 
SET status = :status!, last_error = :error, attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP
WHERE id = :id!;

/* @name insertJobAttempt */
INSERT INTO job_attempts (job_id, attempt_number, status, error_message)
SELECT id, attempts, status, last_error FROM processing_jobs WHERE id = :id!;

/* @name findLeasableJob */
SELECT id FROM processing_jobs 
WHERE (status = 'queued' OR (status = 'running' AND locked_at < NOW() - (:leaseTimeMinutes! * INTERVAL '1 minute')))
ORDER BY priority DESC, created_at ASC 
LIMIT 1
FOR UPDATE SKIP LOCKED;

/* @name lockJob */
UPDATE processing_jobs 
SET status = 'running', 
    locked_by = :workerId!, 
    locked_at = CURRENT_TIMESTAMP,
    attempts = attempts + 1,
    updated_at = CURRENT_TIMESTAMP
WHERE id = :id!
RETURNING
  id,
  run_id,
  step_name,
  target_type,
  target_id,
  status,
  attempts,
  max_attempts,
  locked_by,
  locked_at,
  last_error,
  created_at,
  updated_at;
