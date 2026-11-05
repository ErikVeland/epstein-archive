import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getApiPool, drainPools } from '../server/db/connection.js';
import { investigationsRepository } from '../server/db/investigationsRepository.js';
import { entityConnectionsRepository } from '../server/db/entityConnectionsRepository.js';
import { intelligenceRepository } from '../server/db/intelligenceRepository.js';
import { thinHighRiskEntitySchema } from '../shared/schemas/intelligenceSchema.js';
import { mapInvestigativeLeadDto } from '../server/mappers/investigationsDtoMapper.js';
import { mediaRepository } from '../server/db/mediaRepository.js';

describe('repositories against the migrated schema', () => {
  let investigationId: number;
  let documentId: number;
  let entityId: number;
  let otherId: number;
  const mediaBase = Date.now() * 1000;
  beforeAll(async () => {
    const pool = getApiPool();
    const suffix = randomUUID();
    const entities = await pool.query(
      "INSERT INTO entities (full_name, risk_level) VALUES ($1, 'HIGH'), ($2, 'LOW') RETURNING id",
      [`Synthetic ${suffix}`, `Neighbour ${suffix}`],
    );
    [entityId, otherId] = entities.rows.map((row) => Number(row.id));
    documentId = Number(
      (
        await pool.query(
          'INSERT INTO documents (file_name, file_path) VALUES ($1, $2) RETURNING id',
          ['synthetic.txt', suffix],
        )
      ).rows[0].id,
    );
    investigationId = Number(
      (
        await pool.query(
          "INSERT INTO investigations (title, status) VALUES ($1, 'open') RETURNING id",
          [`Synthetic ${suffix}`],
        )
      ).rows[0].id,
    );
    await pool.query(
      'INSERT INTO entity_mentions (id, entity_id, document_id) VALUES ($1, $2, $3)',
      [randomUUID(), entityId, documentId],
    );
    await pool.query(
      'INSERT INTO entity_relationships (source_entity_id, target_entity_id, relationship_type, proximity_score, confidence) VALUES ($1, $2, $3, $4, $5)',
      [entityId, otherId, 'synthetic', 2, 0.8],
    );
  });
  afterAll(async () => {
    const pool = getApiPool();
    await pool.query('DELETE FROM media_items WHERE id = ANY($1::text[])', [
      Array.from({ length: 202 }, (_, index) => String(mediaBase + index + 1)),
    ]);
    if (investigationId)
      await pool.query('DELETE FROM investigations WHERE id = $1', [investigationId]);
    if (documentId) await pool.query('DELETE FROM documents WHERE id = $1', [documentId]);
    if (entityId && otherId)
      await pool.query('DELETE FROM entities WHERE id = ANY($1::bigint[])', [[entityId, otherId]]);
    await drainPools();
  });

  it('creates, reads, updates and links document-backed leads without a forensic signal column', async () => {
    const lead = await investigationsRepository.createLead(investigationId, {
      title: 'Synthetic lead',
      source_document_id: documentId,
    });
    expect(lead.title).toBe('Synthetic lead');
    const updated = await investigationsRepository.updateLead(Number(lead.id), investigationId, {
      title: 'Updated synthetic lead',
    });
    expect(updated.title).toBe('Updated synthetic lead');
    const sparse = await investigationsRepository.updateLead(Number(lead.id), investigationId, {
      status: 'pursued',
      title: undefined,
      priority: undefined,
    });
    expect(sparse.title).toBe('Updated synthetic lead');
    expect(sparse.priority).toBe('medium');
    expect(
      (await investigationsRepository.getLeads(investigationId)).map((row) => row.title),
    ).toContain('Updated synthetic lead');
    expect(
      (await investigationsRepository.getInvestigationsByEntityId(entityId)).map((row) =>
        Number(row.id),
      ),
    ).toContain(investigationId);
  });

  it('returns direct connection evidence while the optional materialised signals are unpopulated', async () => {
    const connections = await entityConnectionsRepository.getConnections(entityId);
    expect(connections.some((connection) => connection.entityId === String(otherId))).toBe(true);
    expect(await entityConnectionsRepository.getConnections(entityId, { minScore: 1000 })).toEqual(
      [],
    );
  });

  it('returns numeric intelligence IDs from PostgreSQL bigint values', async () => {
    const queue = await intelligenceRepository.getThinHighRiskEntities();
    const entity = queue.find((row) => String(row.entityId) === String(entityId));
    expect(thinHighRiskEntitySchema.parse(entity).entityId).toBe(entityId);
  });

  it('preserves canonical lead provenance and serialises PostgreSQL timestamps', () => {
    const lead = mapInvestigativeLeadDto({
      source_efta_ref: 'EFTA00000001',
      assigned_to: 'analyst',
      created_by: 'reviewer',
      resolved_at: new Date('2026-11-05T00:00:00Z'),
      resolution_notes: 'Synthetic resolution',
    });
    expect(lead).toMatchObject({
      sourceEftaRef: 'EFTA00000001',
      assignedTo: 'analyst',
      createdBy: 'reviewer',
      resolvedAt: '2026-11-05T00:00:00.000Z',
      resolutionNotes: 'Synthetic resolution',
    });
  });

  it('bounds media previews and keeps blank text from matching unrelated entities', async () => {
    const pool = getApiPool();
    await pool.query(
      `INSERT INTO media_items (id, entity_id, file_path, file_type, title, description, red_flag_rating)
      SELECT ($1::bigint+n)::text, $2, 'synthetic/'||($1::bigint+n)::text||'.jpg', 'image/jpeg', 'Synthetic linked photo', '', 0
      FROM generate_series(1,201) n`,
      [mediaBase, entityId],
    );
    await pool.query(
      "INSERT INTO media_items (id, entity_id, file_path, file_type, title, description, red_flag_rating) VALUES ($1, $2, 'synthetic/unrelated.jpg', 'image/jpeg', '', ' ', 5)",
      [String(mediaBase + 202), otherId],
    );
    const media = await mediaRepository.getMediaItems(String(entityId));
    expect(media).toHaveLength(200);
    expect(media.every((item) => String(item.entityId) === String(entityId))).toBe(true);
  });
});
