import crypto from 'crypto';
import 'dotenv/config';
import { getMaintenancePool } from '../src/server/db/connection.js';

type Row<T extends string> = Record<T, unknown>;

async function upsertDocument(params: {
  filePath: string;
  fileName: string;
  title: string;
  content: string;
}): Promise<number> {
  const pool = getMaintenancePool();
  const existing = await pool.query<Row<'id'>>('SELECT id FROM documents WHERE file_path = $1', [
    params.filePath,
  ]);
  if (existing.rows[0]?.id) return Number(existing.rows[0].id);

  const inserted = await pool.query<Row<'id'>>(
    `INSERT INTO documents (file_path, file_name, title, content, file_type, processing_status, source_collection)
     VALUES ($1, $2, $3, $4, 'text/plain', 'seeded', 'local-minimal')
     RETURNING id`,
    [params.filePath, params.fileName, params.title, params.content],
  );
  return Number(inserted.rows[0].id);
}

async function upsertEntity(params: { fullName: string; type?: string }): Promise<number> {
  const pool = getMaintenancePool();
  const existing = await pool.query<Row<'id'>>(
    'SELECT id FROM entities WHERE full_name = $1 AND entity_type = $2 ORDER BY id ASC LIMIT 1',
    [params.fullName, params.type ?? 'Person'],
  );
  if (existing.rows[0]?.id) return Number(existing.rows[0].id);

  const inserted = await pool.query<Row<'id'>>(
    `INSERT INTO entities (full_name, entity_type, entity_category, risk_level, notes)
     VALUES ($1, $2, 'seed', 'unknown', 'local minimal seed')
     RETURNING id`,
    [params.fullName, params.type ?? 'Person'],
  );
  return Number(inserted.rows[0].id);
}

async function ensureMention(params: {
  entityId: number;
  documentId: number;
  surfaceText: string;
}) {
  const pool = getMaintenancePool();
  const exists = await pool.query<Row<'id'>>(
    'SELECT id FROM entity_mentions WHERE entity_id = $1 AND document_id = $2 LIMIT 1',
    [params.entityId, params.documentId],
  );
  if (exists.rows.length > 0) return;

  await pool.query(
    `INSERT INTO entity_mentions
      (id, entity_id, document_id, start_offset, end_offset, surface_text, mention_type, mention_context, confidence)
     VALUES
      ($1, $2, $3, 0, $4, $5, 'seed', 'local minimal seed', 1.0)`,
    [
      crypto.randomUUID(),
      params.entityId,
      params.documentId,
      params.surfaceText.length,
      params.surfaceText,
    ],
  );
}

async function ensureRelationship(params: {
  sourceEntityId: number;
  targetEntityId: number;
  relationshipType: string;
}) {
  const pool = getMaintenancePool();
  await pool.query(
    `INSERT INTO entity_relationships
      (source_entity_id, target_entity_id, relationship_type, strength, confidence, proximity_score, risk_score)
     VALUES
      ($1, $2, $3, 0.2, 0.5, 0.0, 0.0)
     ON CONFLICT DO NOTHING`,
    [params.sourceEntityId, params.targetEntityId, params.relationshipType],
  );
}

async function ensureInvestigation(params: { uuid: string; title: string; description: string }) {
  const pool = getMaintenancePool();
  const existing = await pool.query<Row<'id'>>('SELECT id FROM investigations WHERE uuid = $1', [
    params.uuid,
  ]);
  if (existing.rows[0]?.id) return Number(existing.rows[0].id);

  const inserted = await pool.query<Row<'id'>>(
    `INSERT INTO investigations (uuid, title, description, status, priority, created_by)
     VALUES ($1, $2, $3, 'active', 'low', 'seed')
     RETURNING id`,
    [params.uuid, params.title, params.description],
  );
  return Number(inserted.rows[0].id);
}

async function ensureInvestigationEvidence(params: {
  investigationId: number;
  documentId: number;
}) {
  const pool = getMaintenancePool();
  await pool.query(
    `INSERT INTO investigation_evidence (investigation_id, document_id, added_by, notes)
     VALUES ($1, $2, 'seed', 'local minimal seed')
     ON CONFLICT DO NOTHING`,
    [params.investigationId, params.documentId],
  );
}

async function main() {
  const pool = getMaintenancePool();
  await pool.query('SELECT 1');

  const docId = await upsertDocument({
    filePath: 'seed://local-minimal/brief.txt',
    fileName: 'brief.txt',
    title: 'Local Minimal Seed Document',
    content:
      'This is a minimal local seed document used to validate the UI + API stack. It mentions Jeffrey Epstein and Ghislaine Maxwell.',
  });

  const epsteinId = await upsertEntity({ fullName: 'Jeffrey Epstein', type: 'Person' });
  const maxwellId = await upsertEntity({ fullName: 'Ghislaine Maxwell', type: 'Person' });

  await ensureMention({ entityId: epsteinId, documentId: docId, surfaceText: 'Jeffrey Epstein' });
  await ensureMention({ entityId: maxwellId, documentId: docId, surfaceText: 'Ghislaine Maxwell' });
  await ensureRelationship({
    sourceEntityId: epsteinId,
    targetEntityId: maxwellId,
    relationshipType: 'co_occurrence',
  });

  const investigationUuid = '11111111-1111-1111-1111-111111111111';
  const invId = await ensureInvestigation({
    uuid: investigationUuid,
    title: 'Local Minimal Seed Investigation',
    description: 'Seed investigation created for local stack validation.',
  });
  await ensureInvestigationEvidence({ investigationId: invId, documentId: docId });

  console.log(
    JSON.stringify(
      {
        ok: true,
        seeded: {
          documentId: docId,
          entityIds: { epsteinId, maxwellId },
          investigation: { id: invId, uuid: investigationUuid },
        },
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[seed_minimal] ${message}`);
    process.exit(1);
  });
