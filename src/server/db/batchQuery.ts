import pg from 'pg';
import { getApiPool } from './connection.js';

/**
 * Batch-fetches rows using ANY($1::bigint[]) — injection-safe, chunked to avoid
 * overwhelming the PG planner with huge IN-lists.
 *
 * Usage:
 *   const media = await batchFetch<MediaItem>(
 *     'SELECT * FROM media_items WHERE entity_id = ANY($1::bigint[]) ORDER BY created_at DESC',
 *     entityIds,
 *   );
 */
export async function batchFetch<T extends pg.QueryResultRow>(
  sql: string, // must use $1::bigint[] as the only parameter
  ids: (string | number)[],
  chunkSize = 500,
): Promise<T[]> {
  if (ids.length === 0) return [];
  const pool = getApiPool();
  const results: T[] = [];

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize).map(Number);
    const { rows } = await pool.query<T>(sql, [chunk]);
    results.push(...rows);
  }

  return results;
}

/**
 * Batch-fetches with an extra parameter (e.g. a filter).
 * Place the ID array as $1 and additional params as $2..$N.
 */
export async function batchFetchWithParams<T extends pg.QueryResultRow>(
  sql: string,
  ids: (string | number)[],
  extraParams: unknown[] = [],
  chunkSize = 500,
): Promise<T[]> {
  if (ids.length === 0) return [];
  const pool = getApiPool();
  const results: T[] = [];

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize).map(Number);
    const { rows } = await pool.query<T>(sql, [chunk, ...extraParams]);
    results.push(...rows);
  }

  return results;
}
