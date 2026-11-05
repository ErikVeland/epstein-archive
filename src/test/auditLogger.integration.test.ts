import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { getApiPool, drainPools } from '../server/db/connection.js';
import { logAudit } from '../server/utils/auditLogger.js';

describe('audit writes against the migrated schema', () => {
  beforeAll(() => vi.stubEnv('NODE_ENV', 'production'));
  afterAll(async () => {
    vi.unstubAllEnvs();
    await drainPools();
  });

  it('records evidence access in both audit tables without an actor_type column in audit_log', async () => {
    const targetId = randomUUID();
    const requestId = randomUUID();
    await logAudit(
      'view',
      null,
      'regression-test',
      targetId,
      { source: 'synthetic' },
      undefined,
      requestId,
    );
    const legacy = await getApiPool().query(
      'SELECT actor_id, action, target_type, target_id, payload_json FROM audit_log WHERE target_id = $1',
      [targetId],
    );
    expect(legacy.rows).toEqual([
      {
        actor_id: 'system',
        action: 'view',
        target_type: 'regression-test',
        target_id: targetId,
        payload_json: { source: 'synthetic', _requestId: requestId },
      },
    ]);
    const events = await getApiPool().query(
      'SELECT actor_id, actor_type, action, target_id, request_id, event_hash FROM audit_events_v2 WHERE target_id = $1',
      [targetId],
    );
    expect(events.rows).toEqual([
      {
        actor_id: 'system',
        actor_type: 'system',
        action: 'view',
        target_id: targetId,
        request_id: requestId,
        event_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
    ]);
  });
});
