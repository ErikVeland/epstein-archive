import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import dotenv from 'dotenv';
import { Client } from 'pg';
import { getEmbedding } from '../src/server/semantic/embedding.js';

dotenv.config();

type Target = 'documents' | 'entities';

type Checkpoint = {
  documentsLastId: number;
  entitiesLastId: number;
  updatedAt?: string;
};

type DocumentRow = {
  id: string;
  title: string | null;
  file_name: string | null;
  evidence_type: string | null;
  source_collection: string | null;
  content: string | null;
  content_refined?: string | null;
};

type EntityRow = {
  id: string;
  full_name: string | null;
  primary_role: string | null;
  aliases: string | null;
  bio: string | null;
  notes: string | null;
  red_flag_description: string | null;
  connections_summary: string | null;
};

const BATCH_SIZE = positiveInt(process.env.SEMANTIC_BACKFILL_BATCH, 25);
const MAX_ROWS = nonNegativeInt(process.env.SEMANTIC_BACKFILL_MAX, 0);
const MAX_TEXT_CHARS = positiveInt(process.env.SEMANTIC_BACKFILL_TEXT_CHARS, 6000);
const EXPECTED_DIMENSIONS = positiveInt(process.env.SEMANTIC_EMBEDDING_DIMENSIONS, 384);
const MAX_CONSECUTIVE_FAILURES = positiveInt(
  process.env.SEMANTIC_BACKFILL_MAX_CONSECUTIVE_FAILURES,
  5,
);
const CHECKPOINT_DIR = './pipeline_checkpoints';
const CHECKPOINT_FILE = join(CHECKPOINT_DIR, 'semantic_embeddings.json');

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const RESET = args.has('--reset');

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

function nonNegativeInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : fallback;
}

function selectedTargets(): Target[] {
  if (args.has('--documents')) return ['documents'];
  if (args.has('--entities')) return ['entities'];
  return ['entities', 'documents'];
}

function loadCheckpoint(): Checkpoint {
  if (RESET) {
    return { documentsLastId: 0, entitiesLastId: 0 };
  }

  if (!existsSync(CHECKPOINT_FILE)) {
    return { documentsLastId: 0, entitiesLastId: 0 };
  }

  try {
    const parsed = JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf8')) as Partial<Checkpoint>;
    return {
      documentsLastId: Number(parsed.documentsLastId || 0),
      entitiesLastId: Number(parsed.entitiesLastId || 0),
      updatedAt: parsed.updatedAt,
    };
  } catch (error) {
    console.warn('[semantic-backfill] could not read checkpoint, starting from ID 0', error);
    return { documentsLastId: 0, entitiesLastId: 0 };
  }
}

function saveCheckpoint(checkpoint: Checkpoint): void {
  if (!existsSync(CHECKPOINT_DIR)) {
    mkdirSync(CHECKPOINT_DIR, { recursive: true });
  }

  writeFileSync(
    CHECKPOINT_FILE,
    JSON.stringify({ ...checkpoint, updatedAt: new Date().toISOString() }, null, 2),
  );
}

function cleanText(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) =>
      String(part || '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join('\n')
    .slice(0, MAX_TEXT_CHARS)
    .trim();
}

function documentEmbeddingText(row: DocumentRow): string {
  return cleanText([
    row.title,
    row.file_name,
    row.evidence_type ? `Evidence type: ${row.evidence_type}` : null,
    row.source_collection ? `Source: ${row.source_collection}` : null,
    row.content_refined || row.content,
  ]);
}

function entityEmbeddingText(row: EntityRow): string {
  return cleanText([
    row.full_name,
    row.primary_role,
    row.aliases ? `Aliases: ${row.aliases}` : null,
    row.bio,
    row.notes,
    row.red_flag_description,
    row.connections_summary,
  ]);
}

async function tableColumns(client: Client, tableName: string): Promise<Set<string>> {
  const { rows } = await client.query<{ column_name: string }>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
    `,
    [tableName],
  );
  return new Set(rows.map((row) => row.column_name));
}

async function assertSemanticSchema(client: Client): Promise<void> {
  const extension = await client.query<{ installed: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS installed",
  );
  if (!extension.rows[0]?.installed) {
    throw new Error('pgvector extension is not installed; run pnpm db:migrate:pg first');
  }

  const [documentColumns, entityColumns] = await Promise.all([
    tableColumns(client, 'documents'),
    tableColumns(client, 'entities'),
  ]);

  if (!documentColumns.has('content_embedding')) {
    throw new Error('documents.content_embedding is missing; run pnpm db:migrate:pg first');
  }
  if (!entityColumns.has('description_embedding')) {
    throw new Error('entities.description_embedding is missing; run pnpm db:migrate:pg first');
  }
}

async function fetchDocumentRows(
  client: Client,
  lastId: number,
  limit: number,
): Promise<DocumentRow[]> {
  const documentColumns = await tableColumns(client, 'documents');
  const contentRefinedSelect = documentColumns.has('content_refined')
    ? 'content_refined'
    : 'NULL::text AS content_refined';

  const { rows } = await client.query<DocumentRow>(
    `
      SELECT
        id::text AS id,
        title,
        file_name,
        evidence_type,
        source_collection,
        content,
        ${contentRefinedSelect}
      FROM documents
      WHERE id > $1
        AND content_embedding IS NULL
        AND (
          COALESCE(title, '') <> ''
          OR COALESCE(file_name, '') <> ''
          OR COALESCE(content, '') <> ''
          ${documentColumns.has('content_refined') ? "OR COALESCE(content_refined, '') <> ''" : ''}
        )
      ORDER BY id ASC
      LIMIT $2
    `,
    [lastId, limit],
  );

  return rows;
}

async function fetchEntityRows(
  client: Client,
  lastId: number,
  limit: number,
): Promise<EntityRow[]> {
  const { rows } = await client.query<EntityRow>(
    `
      SELECT
        id::text AS id,
        full_name,
        primary_role,
        aliases,
        bio,
        notes,
        red_flag_description,
        connections_summary
      FROM entities
      WHERE id > $1
        AND description_embedding IS NULL
        AND (
          COALESCE(full_name, '') <> ''
          OR COALESCE(primary_role, '') <> ''
          OR COALESCE(aliases, '') <> ''
          OR COALESCE(bio, '') <> ''
          OR COALESCE(notes, '') <> ''
        )
      ORDER BY id ASC
      LIMIT $2
    `,
    [lastId, limit],
  );

  return rows;
}

async function updateEmbedding(
  client: Client,
  target: Target,
  id: string,
  embedding: number[],
): Promise<void> {
  const column = target === 'documents' ? 'content_embedding' : 'description_embedding';
  const table = target;
  await client.query(`UPDATE ${table} SET ${column} = $2::vector WHERE id = $1`, [
    id,
    JSON.stringify(embedding),
  ]);
}

async function backfillTarget(
  client: Client,
  target: Target,
  checkpoint: Checkpoint,
): Promise<{ processed: number; updated: number; failed: number }> {
  const checkpointKey = target === 'documents' ? 'documentsLastId' : 'entitiesLastId';
  let processed = 0;
  let updated = 0;
  let failed = 0;
  let consecutiveFailures = 0;

  while (MAX_ROWS === 0 || processed < MAX_ROWS) {
    const remaining = MAX_ROWS === 0 ? BATCH_SIZE : Math.min(BATCH_SIZE, MAX_ROWS - processed);
    const rows =
      target === 'documents'
        ? await fetchDocumentRows(client, checkpoint[checkpointKey], remaining)
        : await fetchEntityRows(client, checkpoint[checkpointKey], remaining);

    if (rows.length === 0) break;

    for (const row of rows) {
      const id = Number(row.id);
      const text =
        target === 'documents'
          ? documentEmbeddingText(row as DocumentRow)
          : entityEmbeddingText(row as EntityRow);

      if (!text) {
        checkpoint[checkpointKey] = id;
        continue;
      }

      try {
        processed += 1;
        if (DRY_RUN) {
          console.log(`[semantic-backfill] dry-run ${target} id=${row.id} chars=${text.length}`);
        } else {
          const embedding = await getEmbedding(text);
          if (embedding.length !== EXPECTED_DIMENSIONS) {
            throw new Error(
              `embedding dimension mismatch: expected ${EXPECTED_DIMENSIONS}, got ${embedding.length}`,
            );
          }
          await updateEmbedding(client, target, row.id, embedding);
          updated += 1;
        }

        consecutiveFailures = 0;
        checkpoint[checkpointKey] = id;
      } catch (error) {
        failed += 1;
        consecutiveFailures += 1;
        console.error(`[semantic-backfill] failed ${target} id=${row.id}`, error);
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          throw new Error(
            `aborting ${target} backfill after ${consecutiveFailures} consecutive failures`,
          );
        }
      }
    }

    saveCheckpoint(checkpoint);
    console.log(
      `[semantic-backfill] ${target} progress processed=${processed} updated=${updated} failed=${failed} lastId=${checkpoint[checkpointKey]}`,
    );

    if (rows.length < remaining) break;
  }

  return { processed, updated, failed };
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({
    connectionString,
    application_name: 'semantic-embedding-backfill',
    statement_timeout: 0,
  });

  await client.connect();
  const checkpoint = loadCheckpoint();

  try {
    await assertSemanticSchema(client);
    console.log(
      `[semantic-backfill] starting targets=${selectedTargets().join(',')} batch=${BATCH_SIZE} maxRows=${MAX_ROWS || 'unlimited'} dryRun=${DRY_RUN}`,
    );

    const totals = { processed: 0, updated: 0, failed: 0 };
    for (const target of selectedTargets()) {
      const result = await backfillTarget(client, target, checkpoint);
      totals.processed += result.processed;
      totals.updated += result.updated;
      totals.failed += result.failed;
      saveCheckpoint(checkpoint);
    }

    console.log('[semantic-backfill] done', JSON.stringify(totals));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[semantic-backfill] fatal', error);
  process.exit(1);
});
