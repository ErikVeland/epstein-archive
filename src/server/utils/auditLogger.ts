import { getApiPool } from '../db/connection.js';

type AuditLogMode = 'modern' | 'legacy_user' | 'legacy_operation' | 'none';
let auditLogModeCache: AuditLogMode | null = null;

const detectAuditLogMode = async (): Promise<AuditLogMode> => {
  if (auditLogModeCache) return auditLogModeCache;
  const pool = getApiPool();

  try {
    const result = await pool.query<{ column_name: string }>(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'audit_log'
      `,
    );
    const columns = new Set(result.rows.map((row) => String(row.column_name || '').toLowerCase()));

    if (
      columns.has('actor_id') &&
      columns.has('actor_type') &&
      columns.has('action') &&
      columns.has('target_type') &&
      columns.has('target_id')
    ) {
      auditLogModeCache = 'modern';
      return auditLogModeCache;
    }

    if (
      columns.has('user_id') &&
      columns.has('action') &&
      columns.has('object_type') &&
      columns.has('object_id')
    ) {
      auditLogModeCache = 'legacy_user';
      return auditLogModeCache;
    }

    if (columns.has('operation') && columns.has('entity_type') && columns.has('entity_id')) {
      auditLogModeCache = 'legacy_operation';
      return auditLogModeCache;
    }

    auditLogModeCache = 'none';
    return auditLogModeCache;
  } catch {
    auditLogModeCache = 'none';
    return auditLogModeCache;
  }
};

export const logAudit = async (
  action: string,
  userId: string | null,
  objectType: string,
  objectId: string | null,
  payload?: Record<string, unknown>,
  ip?: string,
  requestId?: string,
) => {
  const pool = getApiPool();
  const actorId = userId || 'system';
  const actorType = userId ? 'user' : 'system';

  const payloadWithRequestId =
    payload || requestId
      ? JSON.stringify({
          ...(payload || {}),
          ...(requestId ? { _requestId: requestId } : {}),
        })
      : null;

  const mode = await detectAuditLogMode();
  if (mode === 'none') return;

  try {
    if (mode === 'modern') {
      await pool.query(
        `
          INSERT INTO audit_log (
            actor_id, actor_type, action, target_type, target_id, payload_json, ip_address
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [actorId, actorType, action, objectType, objectId, payloadWithRequestId, ip || null],
      );
      return;
    }

    if (mode === 'legacy_user') {
      await pool.query(
        `
          INSERT INTO audit_log (
            user_id, action, object_type, object_id, payload_json
          )
          VALUES ($1, $2, $3, $4, $5)
        `,
        [userId || null, action, objectType, objectId, payloadWithRequestId],
      );
      return;
    }

    await pool.query(
      `
        INSERT INTO audit_log (
          operation, entity_type, entity_id, details_json
        )
        VALUES ($1, $2, $3, $4)
      `,
      [action, objectType, objectId, payloadWithRequestId],
    );
  } catch {
    // Audit logging must never break the request path.
    return;
  }
};
