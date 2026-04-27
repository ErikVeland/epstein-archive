import { randomUUID } from 'crypto';
import type { Pool } from 'pg';
import { getApiPool } from '../db/connection.js';

/**
 * Generate a standard UUID for evidentiary traceability.
 */
export function makeId(): string {
  return randomUUID();
}

export class EntityIdError extends Error {
  constructor(entityId: string) {
    super(`Invalid entityId "${entityId}". Expected a positive integer.`);
    this.name = 'EntityIdError';
  }
}

export interface CanonicalEntityIdResolution {
  rawId: bigint;
  canonicalId: bigint;
  found: boolean;
}

export function parseEntityId(entityId: string | number | bigint): bigint {
  const normalized = String(entityId).trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    throw new EntityIdError(normalized);
  }
  return BigInt(normalized);
}

export async function resolveCanonicalEntityId(
  entityId: string | number | bigint,
  pool: Pick<Pool, 'query'> = getApiPool(),
): Promise<CanonicalEntityIdResolution> {
  const rawId = parseEntityId(entityId);
  const result = await pool.query<{ canonical_id: string | number | bigint | null }>(
    `SELECT COALESCE(canonical_id, id) AS canonical_id
     FROM entities
     WHERE id = $1::bigint OR canonical_id = $1::bigint
     ORDER BY CASE WHEN id = $1::bigint THEN 0 ELSE 1 END
     LIMIT 1`,
    [rawId],
  );
  const row = result.rows[0];
  return {
    rawId,
    canonicalId: row?.canonical_id != null ? BigInt(row.canonical_id) : rawId,
    found: Boolean(row),
  };
}
