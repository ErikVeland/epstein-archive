import crypto from 'crypto';
import 'dotenv/config';
import { getMaintenancePool } from '../src/server/db/connection.js';

type Row<T extends string> = Record<T, unknown>;

async function getColumnSet(table: string): Promise<Set<string>> {
  const pool = getMaintenancePool();
  const res = await pool.query<Row<'column_name'>>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = $1`,
    [table],
  );
  return new Set(res.rows.map((r) => String(r.column_name)));
}

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

  const columns = await getColumnSet('documents');
  const insertColumns: string[] = [];
  const insertValues: unknown[] = [];

  if (columns.has('file_path')) {
    insertColumns.push('file_path');
    insertValues.push(params.filePath);
  }
  if (columns.has('file_name')) {
    insertColumns.push('file_name');
    insertValues.push(params.fileName);
  }
  if (columns.has('title')) {
    insertColumns.push('title');
    insertValues.push(params.title);
  }
  if (columns.has('content')) {
    insertColumns.push('content');
    insertValues.push(params.content);
  }
  if (columns.has('mime_type')) {
    insertColumns.push('mime_type');
    insertValues.push('text/plain');
  } else if (columns.has('file_type')) {
    insertColumns.push('file_type');
    insertValues.push('text/plain');
  }
  if (columns.has('processing_status')) {
    insertColumns.push('processing_status');
    insertValues.push('seeded');
  }
  if (columns.has('source_collection')) {
    insertColumns.push('source_collection');
    insertValues.push('local-minimal');
  }
  if (columns.has('evidence_type')) {
    insertColumns.push('evidence_type');
    insertValues.push('document');
  }

  const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`).join(', ');
  const inserted = await pool.query<Row<'id'>>(
    `INSERT INTO documents (${insertColumns.join(', ')})
     VALUES (${placeholders})
     RETURNING id`,
    insertValues,
  );
  return Number(inserted.rows[0].id);
}

async function upsertEntity(params: { fullName: string; type?: string }): Promise<number> {
  const pool = getMaintenancePool();
  const columns = await getColumnSet('entities');
  const typeColumn = columns.has('entity_type')
    ? 'entity_type'
    : columns.has('type')
      ? 'type'
      : null;

  const existing = await pool.query<Row<'id'>>(
    typeColumn
      ? `SELECT id FROM entities WHERE full_name = $1 AND ${typeColumn} = $2 ORDER BY id ASC LIMIT 1`
      : 'SELECT id FROM entities WHERE full_name = $1 ORDER BY id ASC LIMIT 1',
    typeColumn ? [params.fullName, params.type ?? 'Person'] : [params.fullName],
  );
  if (existing.rows[0]?.id) return Number(existing.rows[0].id);

  const insertColumns: string[] = ['full_name'];
  const insertValues: unknown[] = [params.fullName];

  if (typeColumn) {
    insertColumns.push(typeColumn);
    insertValues.push(params.type ?? 'Person');
  }
  if (columns.has('entity_type') && typeColumn !== 'entity_type') {
    insertColumns.push('entity_type');
    insertValues.push(params.type ?? 'Person');
  }
  if (columns.has('entity_category')) {
    insertColumns.push('entity_category');
    insertValues.push('seed');
  }
  if (columns.has('risk_level')) {
    insertColumns.push('risk_level');
    insertValues.push('unknown');
  }
  if (columns.has('notes')) {
    insertColumns.push('notes');
    insertValues.push('local minimal seed');
  }

  const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`).join(', ');
  const inserted = await pool.query<Row<'id'>>(
    `INSERT INTO entities (${insertColumns.join(', ')})
     VALUES (${placeholders})
     RETURNING id`,
    insertValues,
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
