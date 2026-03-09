import { getApiPool } from '../db/connection.js';
import os from 'os';

export class JobManager {
  private workerId: string;

  constructor(workerId?: string) {
    const hostname = os.hostname() || 'unknown-host';
    this.workerId = workerId || `${hostname}-worker-${process.pid}-${Date.now()}`;
  }

  /**
   * Acquires a lock on the next available document.
   * Single-job variant — prefer acquireJobBatch for throughput-sensitive loops.
   */
  async acquireJob(ttlSeconds: number = 300, collectionPriority?: string[]) {
    const batch = await this.acquireJobBatch(1, ttlSeconds, collectionPriority);
    return batch[0] ?? null;
  }

  /**
   * Atomically leases up to `n` documents in a single transaction.
   * One DB round-trip fills all available worker slots at once, so AI calls
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
    const pool = getApiPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      let orderClause: string;
      let findParams: unknown[];

      if (collectionPriority && collectionPriority.length > 0) {
        const cases = collectionPriority
          .map((_, i) => `WHEN source_collection = $${i + 2} THEN ${i}`)
          .join(' ');
        // $1 = limit n, $2..$(n+1) = collection names
        findParams = [n, ...collectionPriority];
        orderClause = `
          CASE WHEN processing_status = 'processing' THEN 0 ELSE 1 END,
          CASE ${cases} ELSE ${collectionPriority.length} END,
          created_at ASC
        `;
      } else {
        findParams = [n];
        orderClause = `
          CASE WHEN processing_status = 'processing' THEN 0 ELSE 1 END,
          created_at ASC
        `;
      }

      const findSql = `
        SELECT id, file_path, source_collection, processing_attempts
        FROM documents
        WHERE processing_status = 'queued'
           OR (processing_status = 'processing' AND lease_expires_at < now())
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
        `UPDATE documents
         SET processing_status    = 'processing',
             worker_id            = $1,
             lease_expires_at     = now() + ($2 || ' seconds')::interval,
             processing_attempts  = processing_attempts + 1,
             last_processed_at    = now()
         WHERE id = ANY($3)`,
        [this.workerId, ttlSeconds, ids],
      );

      await client.query('COMMIT');
      return rows;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Heartbeat to keep the job alive
   */
  async renewLease(documentId: number | string, ttlSeconds: number = 300) {
    const pool = getApiPool();
    await pool.query(
      `
      UPDATE documents 
      SET lease_expires_at = now() + ($1 || ' seconds')::interval
      WHERE id = $2 AND worker_id = $3
    `,
      [ttlSeconds, documentId, this.workerId],
    );
  }

  /**
   * Mark job as complete
   */
  async completeJob(documentId: number | string) {
    const pool = getApiPool();
    await pool.query(
      `
      UPDATE documents 
      SET 
        processing_status = 'completed',
        worker_id = NULL,
        lease_expires_at = NULL,
        processing_error = NULL
      WHERE id = $1
    `,
      [documentId],
    );
  }

  /**
   * Fail the job
   */
  async failJob(documentId: number | string, error: string) {
    const pool = getApiPool();
    await pool.query(
      `
      UPDATE documents 
      SET 
        processing_status = 'failed',
        processing_error = $1,
        worker_id = NULL,
        lease_expires_at = NULL
      WHERE id = $2
    `,
      [error, documentId],
    );
  }

  getWorkerId() {
    return this.workerId;
  }
}
