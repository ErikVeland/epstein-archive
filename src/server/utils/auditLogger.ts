import { getApiPool } from '../db/connection.js';
import { createHash } from 'crypto';
import { logger } from '../services/Logger.js';

type AuditLogMode = 'modern' | 'legacy_user' | 'legacy_operation' | 'none';
let auditLogModeCache: AuditLogMode | null = null;

type AuditV2Mode = 'present' | 'absent';
let auditV2ModeCache: AuditV2Mode | null = null;

const auditFailuresAreFatal = (): boolean => process.env.NODE_ENV === 'production';

// Warn once at startup if running in production without explicit AUDIT_FAIL_CLOSED.
// This makes the implicit fail-closed behaviour visible in the boot log.
let _auditStartupWarned = false;
if (process.env.NODE_ENV === 'production' && !_auditStartupWarned) {
  _auditStartupWarned = true;
  const explicit =
    process.env.AUDIT_FAIL_CLOSED === '1' || process.env.AUDIT_FAIL_CLOSED === 'true';
  if (!explicit) {
    // Use a microtask so the logger is guaranteed to be initialised first
    void Promise.resolve().then(() =>
      logger.info(
        '[Audit] Running in production — fail-closed is ACTIVE (implicit). ' +
          'Set AUDIT_FAIL_CLOSED=1 in .env to make this explicit.',
      ),
    );
  }
}

const stableJson = (value: unknown): string => {
  if (value == null) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  const seen = new WeakSet();
  const normalize = (v: unknown): unknown => {
    if (v == null) return null;
    if (typeof v !== 'object') return v;
    if (seen.has(v as object)) return '[Circular]';
    seen.add(v as object);
    if (Array.isArray(v)) return v.map(normalize);
    const obj = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) out[key] = normalize(obj[key]);
    return out;
  };
  return JSON.stringify(normalize(value));
};

const detectAuditV2Mode = async (): Promise<AuditV2Mode> => {
  if (auditV2ModeCache) return auditV2ModeCache;
  const pool = getApiPool();
  try {
    const { rows } = await pool.query<{ exists: string | null }>(
      "SELECT to_regclass('public.audit_events_v2')::text AS exists",
    );
    auditV2ModeCache = rows[0]?.exists ? 'present' : 'absent';
    return auditV2ModeCache;
  } catch (error) {
    if (auditFailuresAreFatal()) {
      throw new Error(`Unable to inspect audit_events_v2: ${(error as Error).message}`);
    }
    auditV2ModeCache = 'absent';
    return auditV2ModeCache;
  }
};

const appendAuditV2 = async (input: {
  actorId: string;
  actorType: string;
  action: string;
  targetType: string;
  targetId: string | null;
  payloadJson: Record<string, unknown> | null;
  ip: string | null;
  requestId: string | null;
}): Promise<void> => {
  const pool = getApiPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{ event_hash: string | null }>(
      `
        SELECT event_hash
        FROM audit_events_v2
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE
      `,
    );
    const prevEventHash = rows[0]?.event_hash ?? null;
    const canonical = stableJson({
      actorId: input.actorId,
      actorType: input.actorType,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      payload: input.payloadJson,
      ip: input.ip,
      requestId: input.requestId,
    });
    const eventHash = createHash('sha256')
      .update(String(prevEventHash || '') + '|' + canonical)
      .digest('hex');

    await client.query(
      `
        INSERT INTO audit_events_v2 (
          actor_id,
          actor_type,
          action,
          target_type,
          target_id,
          payload_json,
          ip_address,
          request_id,
          prev_event_hash,
          event_hash
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `,
      [
        input.actorId,
        input.actorType,
        input.action,
        input.targetType,
        input.targetId,
        input.payloadJson ? JSON.stringify(input.payloadJson) : null,
        input.ip,
        input.requestId,
        prevEventHash,
        eventHash,
      ],
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

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
  } catch (error) {
    if (auditFailuresAreFatal()) {
      throw new Error(`Unable to inspect audit_log schema: ${(error as Error).message}`);
    }
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
  options?: { failClosed?: boolean },
) => {
  const pool = getApiPool();
  const actorId = userId || 'system';
  const actorType = userId ? 'user' : 'system';

  const failClosed =
    Boolean(options?.failClosed) ||
    process.env.AUDIT_FAIL_CLOSED === '1' ||
    process.env.AUDIT_FAIL_CLOSED === 'true' ||
    auditFailuresAreFatal();

  const payloadWithRequestId =
    payload || requestId
      ? JSON.stringify({
          ...(payload || {}),
          ...(requestId ? { _requestId: requestId } : {}),
        })
      : null;

  const v2Mode = await detectAuditV2Mode();
  if (v2Mode === 'present') {
    try {
      await appendAuditV2({
        actorId,
        actorType,
        action,
        targetType: objectType,
        targetId: objectId,
        payloadJson: payload || null,
        ip: ip || null,
        requestId: requestId || null,
      });
    } catch (error) {
      if (failClosed) {
        throw new Error(`Audit v2 write failed: ${(error as Error).message}`);
      }
    }
  } else if (failClosed) {
    throw new Error('audit_events_v2 table is missing');
  }

  const mode = await detectAuditLogMode();
  if (mode === 'none') {
    if (failClosed) {
      throw new Error('audit_log table is missing or incompatible');
    }
    return;
  }

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
  } catch (error) {
    if (failClosed) {
      throw new Error(`Audit log write failed: ${(error as Error).message}`);
    }
    return;
  }
};
