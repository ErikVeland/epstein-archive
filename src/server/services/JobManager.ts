import { getIngestPool } from '../db/connection.js';
import os from 'os';

export class JobManager {
  private workerId: string;

  constructor(workerId?: string) {
    const hostname = os.hostname() || 'unknown-host';
    this.workerId = workerId || `${hostname}-worker-${process.pid}-${Date.now()}`;
  }

  /**
   * Acquires a lock on the next available job.
   * Single-job variant — prefer acquireJobBatch for throughput-sensitive loops.
   */
  async acquireJob(ttlSeconds: number = 300, collectionPriority?: string[]) {
    const batch = await this.acquireJobBatch(1, ttlSeconds, collectionPriority);
    return batch[0] ?? null;
  }

  /**
   * Atomically leases up to `n` jobs from pipeline_jobs in a single transaction.
   * One DB round-trip fills all available worker slots at once so AI calls
   * launch simultaneously instead of serialising behind individual acquires.
   *
   * Returns an array of { id, file_path, source_collection, processing_attempts }.
   */
  async acquireJobBatch(
    n: number,
    ttlSeconds: number = 300,
    collectionPriority?: string[],
  ): Promise<
    Array<{
      id: number;
      file_path: string;
      source_collection: string | null;
      processing_attempts: number;
    }>
  > {
    if (n <= 0) return [];
    const pool = getIngestPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      let orderClause: string;
      let findParams: unknown[];

      if (collectionPriority && collectionPriority.length > 0) {
        const cases = collectionPriority
          .map((_, i) => `WHEN source_collection = $${i + 2} THEN ${i}`)
          .join(' ');
        findParams = [n, ...collectionPriority];
        orderClause = `
          CASE ${cases} ELSE ${collectionPriority.length} END,
          created_at ASC
        `;
      } else {
        findParams = [n];
        orderClause = `created_at ASC`;
      }

      const findSql = `
        SELECT id, document_id, file_path, source_collection, attempts
        FROM pipeline_jobs
        WHERE status = 'queued'
           OR (status = 'processing' AND lease_expires_at < now())
        ORDER BY ${orderClause}
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      `;

      const { rows } = await client.query(findSql, findParams);
      if (rows.length === 0) {
        await client.query('ROLLBACK');
        return [];
      }

      const ids = rows.map((r) => r.id);
      await client.query(
        `UPDATE pipeline_jobs
         SET status           = 'processing',
             worker_id        = $1,
             lease_expires_at = now() + ($2 || ' seconds')::interval,
             attempts         = attempts + 1,
             updated_at       = now()
         WHERE id = ANY($3)`,
        [this.workerId, ttlSeconds, ids],
      );

      await client.query('COMMIT');

      return rows.map((r) => ({
        id: Number(r.document_id),
        file_path: r.file_path as string,
        source_collection: r.source_collection as string | null,
        processing_attempts: Number(r.attempts),
      }));
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  /** Heartbeat to keep a job lease alive. */
  async renewLease(documentId: number | string, ttlSeconds: number = 300) {
    const pool = getIngestPool();
    await pool.query(
      `UPDATE pipeline_jobs
       SET lease_expires_at = now() + ($1 || ' seconds')::interval,
           updated_at       = now()
       WHERE document_id = $2 AND worker_id = $3`,
      [ttlSeconds, documentId, this.workerId],
    );
  }

  /**
   * Mark a job as complete: delete the pipeline_jobs row and sync
   * documents.processing_status for enrichment backfill queries.
   */
  async completeJob(documentId: number | string) {
    const pool = getIngestPool();
    await pool.query(`DELETE FROM pipeline_jobs WHERE document_id = $1`, [documentId]);
    await pool.query(
      `UPDATE documents
       SET processing_status = 'completed',
           worker_id         = NULL,
           lease_expires_at  = NULL,
           processing_error  = NULL
       WHERE id = $1`,
      [documentId],
    );
  }

  /**
   * Record a job failure: keep the pipeline_jobs row as 'failed' for
   * re-queue at the next run start, and sync documents.processing_status.
   */
  async failJob(documentId: number | string, error: string) {
    const pool = getIngestPool();
    await pool.query(
      `UPDATE pipeline_jobs
       SET status     = 'failed',
           error      = $1,
           worker_id  = NULL,
           lease_expires_at = NULL,
           updated_at = now()
       WHERE document_id = $2`,
      [error, documentId],
    );
    await pool.query(
      `UPDATE documents
       SET processing_status = 'failed',
           processing_error  = $1,
           worker_id         = NULL,
           lease_expires_at  = NULL
       WHERE id = $2`,
      [error, documentId],
    );
  }

  /**
   * Enqueue a document that is not yet in pipeline_jobs.
   * Calling code uses this when inserting a new document into the DB.
   */
  async enqueueDocument(
    documentId: number,
    opts: { sourceCollection?: string | null; filePath?: string | null } = {},
  ) {
    const pool = getIngestPool();
    await pool.query(
      `INSERT INTO pipeline_jobs (document_id, status, source_collection, file_path)
       VALUES ($1, 'queued', $2, $3)
       ON CONFLICT (document_id) DO NOTHING`,
      [documentId, opts.sourceCollection ?? null, opts.filePath ?? null],
    );
  }

  /**
   * Re-queue failed jobs: reset their status to 'queued' so the next run
   * picks them up. Optionally filter to a set of source_collections.
   *
   * retryableOnly: skip docs whose error is a permanent failure (corrupt,
   * encrypted, invalid PDF, password-protected) — these will never succeed.
   */
  async requeueFailed(
    opts: {
      excludeCollections?: string[];
      onlyCollections?: string[];
      maxAttempts?: number;
      retryableOnly?: boolean;
    } = {},
  ): Promise<number> {
    const pool = getIngestPool();

    const whereClauses = [`status = 'failed'`];
    const params: unknown[] = [];
    let idx = 1;

    if (opts.excludeCollections && opts.excludeCollections.length > 0) {
      whereClauses.push(`source_collection != ALL($${idx++})`);
      params.push(opts.excludeCollections);
    }
    if (opts.onlyCollections && opts.onlyCollections.length > 0) {
      whereClauses.push(`source_collection = ANY($${idx++})`);
      params.push(opts.onlyCollections);
    }
    if (opts.maxAttempts !== undefined) {
      whereClauses.push(`(attempts IS NULL OR attempts < $${idx++})`);
      params.push(opts.maxAttempts);
    }
    if (opts.retryableOnly) {
      whereClauses.push(`(
        error IS NULL
        OR (
          error NOT ILIKE '%corrupt%'
          AND error NOT ILIKE '%encrypt%'
          AND error NOT ILIKE '%password%'
          AND error NOT ILIKE '%invalid pdf%'
        )
      )`);
    }

    const { rowCount } = await pool.query(
      `UPDATE pipeline_jobs
       SET status           = 'queued',
           worker_id        = NULL,
           lease_expires_at = NULL,
           error            = NULL,
           updated_at       = now()
       WHERE ${whereClauses.join(' AND ')}`,
      params,
    );
    return rowCount ?? 0;
  }

  /**
   * Returns per-collection queue stats for priority scheduling.
   */
  async getCollectionPriority(): Promise<
    Array<{ source_collection: string; pct_done: string; remaining: string }>
  > {
    const pool = getIngestPool();

    const { rows } = await pool.query<{
      source_collection: string;
      pct_done: string;
      remaining: string;
    }>(`
      SELECT
        d.source_collection,
        ROUND(
          COUNT(*) FILTER (WHERE d.processing_status IN ('succeeded','completed')) * 100.0 / COUNT(*),
          1
        ) AS pct_done,
        COUNT(pj.id) FILTER (WHERE pj.status = 'queued') AS remaining
      FROM documents d
      LEFT JOIN pipeline_jobs pj ON pj.document_id = d.id
      WHERE d.source_collection IS NOT NULL
      GROUP BY d.source_collection
      HAVING COUNT(pj.id) FILTER (WHERE pj.status = 'queued') > 0
      ORDER BY pct_done DESC
    `);
    return rows;
  }

  getWorkerId() {
    return this.workerId;
  }
}
