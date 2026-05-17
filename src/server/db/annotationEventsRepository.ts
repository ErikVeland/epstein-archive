import { createHash } from 'crypto';
import { getApiPool } from './connection.js';
import type { PoolClient } from 'pg';

export type AnnotationEventType =
  | 'draft_created'
  | 'approved'
  | 'rejected'
  | 'forensic_created'
  | 'updated'
  | 'deleted';

export type AnnotationEventInput = {
  annotationId: string;
  documentId: string;
  eventType: AnnotationEventType;
  actorUserId: string | null;
  actorRole: string | null;
  actorFingerprintHash: string | null;
  requestId: string | null;
  payload: Record<string, unknown>;
};

type LastEventRow = { event_hash: string | null };

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
    for (const key of Object.keys(obj).sort()) {
      out[key] = normalize(obj[key]);
    }
    return out;
  };
  return JSON.stringify(normalize(value));
};

export const annotationEventsRepository = {
  async append(input: AnnotationEventInput, existingClient?: PoolClient): Promise<void> {
    const pool = existingClient ? null : getApiPool();
    const client = existingClient ?? (await pool!.connect());
    const ownsTransaction = !existingClient;
    try {
      if (ownsTransaction) await client.query('BEGIN');

      const { rows } = await client.query<LastEventRow>(
        `
          SELECT event_hash
          FROM annotation_events
          WHERE annotation_id = $1
          ORDER BY id DESC
          LIMIT 1
          FOR UPDATE
        `,
        [input.annotationId],
      );
      const prevEventHash = rows[0]?.event_hash ?? null;
      const payloadJson = stableJson({
        annotationId: input.annotationId,
        documentId: input.documentId,
        eventType: input.eventType,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        actorFingerprintHash: input.actorFingerprintHash,
        requestId: input.requestId,
        payload: input.payload,
      });
      const eventHash = createHash('sha256')
        .update(String(prevEventHash || '') + '|' + payloadJson)
        .digest('hex');

      await client.query(
        `
          INSERT INTO annotation_events (
            annotation_id,
            document_id,
            event_type,
            actor_user_id,
            actor_role,
            actor_fingerprint_hash,
            request_id,
            payload_json,
            prev_event_hash,
            event_hash
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        `,
        [
          input.annotationId,
          input.documentId,
          input.eventType,
          input.actorUserId,
          input.actorRole,
          input.actorFingerprintHash,
          input.requestId,
          input.payload,
          prevEventHash,
          eventHash,
        ],
      );

      if (ownsTransaction) await client.query('COMMIT');
    } catch (error) {
      if (ownsTransaction) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (ownsTransaction) client.release();
    }
  },
};
