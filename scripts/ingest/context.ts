// ============================================================================
// INGEST CONTEXT — shared state passed through the pipeline instead of globals
// ============================================================================

import type { Pool } from 'pg';
import { getIngestPool } from '../../src/server/db/connection.js';
import { PipelineService, type PipelineRun } from '../../src/server/services/pipelineService.js';
import { PipelineAuditImpl, type PipelineAudit } from './types.js';
import { PIPELINE_VERSION, STEP_VERSIONS, COLLECTIONS } from './config.js';

export interface IngestContext {
  db: Pool;
  currentRun: PipelineRun | null;
  audit: PipelineAudit;
  shouldRehash: boolean;
}

export async function initDb(): Promise<Pool> {
  const db = getIngestPool();
  console.log('Database gateway initialized (Postgres ingest pool)');
  return db;
}

export async function startPipelineRun(db: Pool): Promise<PipelineRun> {
  console.log(`🚀 Initializing Pipeline Run v${PIPELINE_VERSION}...`);
  const parentRunId = process.env.PIPELINE_RUN_ID;
  const parentRun = parentRunId
    ? (await db.query<PipelineRun>('SELECT * FROM pipeline_runs WHERE id = $1', [parentRunId]))
        .rows[0]
    : undefined;
  const currentRun =
    parentRun ||
    (await PipelineService.startRun(PIPELINE_VERSION, {
      collections: COLLECTIONS.filter((c) => c.enabled).map((c) => c.name),
      step_versions: STEP_VERSIONS,
    }));
  console.log(`   Run UUID: ${currentRun.run_uuid}`);

  // Register basic steps
  await PipelineService.registerStep('discovery', 'Initial file discovery and hashing');
  await PipelineService.registerStep('ingestion', 'Document ingestion and processing');
  await PipelineService.registerStep('extraction', 'Text extraction and OCR');
  await PipelineService.registerStep('intelligence', 'Entity extraction and relationship mapping');

  return currentRun;
}

export async function verifyDatabase(db: Pool): Promise<boolean> {
  console.log('✅ Verifying database connection...');
  try {
    const queue = await db.query<{ queue: string | null }>(
      "SELECT to_regclass('public.processing_jobs')::text AS queue",
    );
    if (!queue.rows[0]?.queue)
      throw new Error(
        'Required processing_jobs queue table is missing; apply the queue migration before ingestion',
      );
    const count = ((await db.query('SELECT COUNT(*) as count FROM documents')).rows[0] ?? null) as {
      count: number;
    };
    console.log(`   Database connected. ${count.count} documents currently in database.`);
    return true;
  } catch (e) {
    console.error('❌ Database connection failed:', e);
    return false;
  }
}

export async function buildContext(shouldRehash: boolean): Promise<IngestContext> {
  const db = await initDb();
  return {
    db,
    currentRun: null,
    audit: new PipelineAuditImpl(),
    shouldRehash,
  };
}
