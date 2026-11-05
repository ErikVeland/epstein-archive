import 'dotenv/config';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { getApiPool, drainPools } from '../server/db/connection.js';
import { reviewQueueRepository } from '../server/db/reviewQueueRepository.js';
import {
  mentionsQueueResponseSchema,
  claimsQueueResponseSchema,
} from '../shared/schemas/reviewQueueSchema.js';

describe('review identifiers against the migrated schema', async () => {
  vi.stubEnv('JWT_SECRET', 'synthetic-review-regression-key');
  const { default: routes } = await import('../server/routes/activeLearning.js');
  const app = express().use(express.json()).use('/api/review', routes);
  const token = jwt.sign({ id: 'synthetic-reviewer', role: 'admin' }, process.env.JWT_SECRET!, {
    expiresIn: '1m',
  });
  const mentionId = randomUUID();
  let documentId: number;
  let entityId: number;
  let claimId: number;
  beforeAll(async () => {
    const pool = getApiPool();
    entityId = Number(
      (
        await pool.query('INSERT INTO entities (full_name) VALUES ($1) RETURNING id', [
          `Synthetic ${mentionId}`,
        ])
      ).rows[0].id,
    );
    documentId = Number(
      (
        await pool.query(
          'INSERT INTO documents (file_name, file_path) VALUES ($1, $2) RETURNING id',
          ['synthetic-review.txt', mentionId],
        )
      ).rows[0].id,
    );
    await pool.query(
      'INSERT INTO entity_mentions (id, entity_id, document_id, confidence) VALUES ($1, $2, $3, $4)',
      [mentionId, entityId, documentId, 0.5],
    );
    claimId = Number(
      (
        await pool.query(
          'INSERT INTO claim_triples (document_id, subject_entity_id, predicate, object_text, confidence) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [documentId, entityId, 'synthetic', 'fixture', 0.5],
        )
      ).rows[0].id,
    );
  });
  afterAll(async () => {
    const pool = getApiPool();
    if (claimId) await pool.query('DELETE FROM claim_triples WHERE id = $1', [claimId]);
    if (documentId) await pool.query('DELETE FROM documents WHERE id = $1', [documentId]);
    if (entityId) await pool.query('DELETE FROM entities WHERE id = $1', [entityId]);
    await drainPools();
    vi.unstubAllEnvs();
  });

  it('preserves canonical text mention IDs and returns numeric claim IDs', async () => {
    const mentions = mentionsQueueResponseSchema.parse(
      await reviewQueueRepository.getMentionsQueue(100),
    );
    expect(mentions.some((mention) => mention.id === mentionId)).toBe(true);
    const claims = claimsQueueResponseSchema.parse(await reviewQueueRepository.getClaimsQueue(100));
    expect(claims.some((claim) => claim.id === claimId)).toBe(true);
  });

  it('accepts UUID mention identifiers for authenticated review actions', async () => {
    const verified = await request(app)
      .post(`/api/review/mentions/${mentionId}/verify`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(verified.status).toBe(200);
    const rejected = await request(app)
      .post('/api/review/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ type: 'mention', id: mentionId, decision: 'reject', reason: 'Synthetic test' }],
      });
    expect(rejected.status).toBe(200);
    const row = await getApiPool().query('SELECT verified FROM entity_mentions WHERE id = $1', [
      mentionId,
    ]);
    expect(row.rows[0].verified).toBe(-1);
    expect(
      (await request(app).post(`/api/review/mentions/${mentionId}/verify`).send({})).status,
    ).toBe(401);
  });
});
