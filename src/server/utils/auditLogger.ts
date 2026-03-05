import { getApiPool } from '../db/connection.js';

export const logAudit = async (
  action: string,
  userId: string | null,
  objectType: string,
  objectId: string | null,
  payload?: any,
  ip?: string,
  requestId?: string,
) => {
  try {
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

    await pool.query(
      `
        INSERT INTO audit_log (
          actor_id, actor_type, action, target_type, target_id, payload_json, ip_address
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [actorId, actorType, action, objectType, objectId, payloadWithRequestId, ip || null],
    );
  } catch (error) {
    console.error('FAILED TO LOG AUDIT:', error);
    throw error;
  }
};
