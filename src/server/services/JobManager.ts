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
   * @param collectionPriority Optional ordered list of source_collection values —
   *   collections listed first are drained before later ones. Compute once per
   *   pipeline run (e.g. sorted by % complete desc) and reuse across all calls.
   */
  async acquireJob(ttlSeconds: number = 300, collectionPriority?: string[]) {
    const pool = getApiPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      let findSql: string;
      let findParams: unknown[];

      if (collectionPriority && collectionPriority.length > 0) {
        const cases = collectionPriority
          .map((_, i) => `WHEN source_collection = $${i + 1} THEN ${i}`)
          .join(' ');
        findParams = [...collectionPriority];
        findSql = `
          SELECT id, file_path, processing_attempts
          FROM documents
          WHERE processing_status = 'queued'
             OR (processing_status = 'processing' AND lease_expires_at < now())
          ORDER BY
             CASE WHEN processing_status = 'processing' THEN 0 ELSE 1 END,
             CASE ${cases} ELSE ${collectionPriority.length} END,
             created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `;
      } else {
        findParams = [];
        findSql = `
          SELECT id, file_path, processing_attempts
          FROM documents
          WHERE processing_status = 'queued'
             OR (processing_status = 'processing' AND lease_expires_at < now())
          ORDER BY
             CASE WHEN processing_status = 'processing' THEN 0 ELSE 1 END,
             created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `;
      }

      const { rows } = await client.query(findSql, findParams);
      const candidate = rows[0];

      if (!candidate) {
        await client.query('ROLLBACK');
        return null;
      }

      // 2. Lock it
      const lockSql = `
        UPDATE documents 
        SET 
          processing_status = 'processing',
          worker_id = $1,
          lease_expires_at = now() + ($2 || ' seconds')::interval,
          processing_attempts = processing_attempts + 1,
          last_processed_at = now()
        WHERE id = $3
      `;

      await client.query(lockSql, [this.workerId, ttlSeconds, candidate.id]);
      await client.query('COMMIT');

      return candidate;
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
