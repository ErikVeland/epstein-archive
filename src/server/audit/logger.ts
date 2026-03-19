import { getApiPool } from '../db/connection.js';
import { logger } from '../services/Logger.js';

export interface AuditEvent {
  userId?: string;
  action: string;
  objectType: string;
  objectId?: string | number | null;
  payload?: unknown;
}

export async function logAudit(event: AuditEvent) {
  try {
    const pool = getApiPool();
    await pool.query(
      `INSERT INTO audit_log (user_id, action, object_type, object_id, payload_json)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        event.userId || null,
        event.action,
        event.objectType,
        event.objectId != null ? String(event.objectId) : null,
        event.payload ? JSON.stringify(event.payload) : null,
      ],
    );
  } catch (e) {
    logger.error({ err: e }, 'Failed to write audit log entry');
    throw e;
  }
}
