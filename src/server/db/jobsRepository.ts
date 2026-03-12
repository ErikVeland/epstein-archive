import { getApiPool } from './connection.js';
export interface ProcessingJob {
  id: number;
  run_id: number;
  step_name: string;
  target_type: 'document' | 'evidence' | 'media';
  target_id: number;
  priority: number;
  status:
    | 'queued'
    | 'running'
    | 'succeeded'
    | 'failed_retryable'
    | 'failed_permanent'
    | 'skipped'
    | 'cancelled';
  attempts: number;
  max_attempts: number;
  last_error?: string;
}

export const jobsRepository = {
  /**
   * Create a new processing job.
   */
  createJob: async (job: Omit<ProcessingJob, 'id' | 'status' | 'attempts' | 'priority'>) => {
    const pool = getApiPool();
    const res = await pool.query(
      `
      INSERT INTO processing_jobs (run_id, step_name, target_type, target_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
      [job.run_id, job.step_name, job.target_type, job.target_id],
    );
    return res.rows[0];
  },

  /**
   * List jobs with filtering.
   */
  listJobs: async (status?: string, targetType?: string) => {
    const pool = getApiPool();
    const where: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (status) {
      where.push(`status = $${i++}`);
      params.push(status);
    }

    if (targetType) {
      where.push(`target_type = $${i++}`);
      params.push(targetType);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const res = await pool.query(
      `SELECT * FROM processing_jobs ${whereClause} ORDER BY priority DESC, created_at ASC`,
      params,
    );
    return res.rows;
  },

  /**
   * Update job status and record attempt.
   */
  updateJobStatus: async (id: number, status: ProcessingJob['status'], error?: string) => {
    const pool = getApiPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `
        UPDATE processing_jobs 
        SET status = $1, last_error = $2, attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `,
        [status, error || null, id],
      );

      await client.query(
        `
        INSERT INTO job_attempts (job_id, attempt_number, status, error_message)
        SELECT id, attempts, status, last_error FROM processing_jobs WHERE id = $1
      `,
        [id],
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  /**
   * Lease a queued job for processing.
   * Atomically finds and locks a job.
   */
  leaseJob: async (workerId: string, leaseTimeMinutes: number = 15) => {
    const pool = getApiPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const findSql = `
        SELECT id FROM processing_jobs
        WHERE (status = 'queued' OR (status = 'running' AND locked_at < CURRENT_TIMESTAMP - ($1 * INTERVAL '1 minute')))
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;

      const res = await client.query(findSql, [leaseTimeMinutes]);
      const job = res.rows[0];
      if (!job) {
        await client.query('ROLLBACK');
        return null;
      }

      const lockSql = `
        UPDATE processing_jobs 
        SET status = 'running', 
            locked_by = $1, 
            locked_at = CURRENT_TIMESTAMP,
            attempts = attempts + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;

      const updateRes = await client.query(lockSql, [workerId, job.id]);
      await client.query('COMMIT');
      return updateRes.rows[0] as ProcessingJob;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
};
