#!/usr/bin/env tsx
/**
 * Unified Evidence Pipeline Orchestrator — PG NATIVE VERSION
 */

import { spawn, execSync } from 'child_process';
import { existsSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';
import { AIEnrichmentService } from '../src/server/services/AIEnrichmentService.js';
import { getIngestPool } from '../src/server/db/connection.js';

// Configuration
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50', 10);
const CONCURRENCY = parseInt(process.env.PIPELINE_CONCURRENCY || '8', 10);
const CHECKPOINT_DIR = './pipeline_checkpoints';

// Ensure AI is enabled with Exo by default
process.env.ENABLE_AI_ENRICHMENT = 'true';
if (!process.env.AI_PROVIDER) {
  process.env.AI_PROVIDER = 'exo_cluster';
}

interface PipelineStats {
  mode: string;
  startTime: string;
  ingestStats?: { filesProcessed: number; errors: number };
  intelStats?: { entitiesExtracted: number; relationsFound: number };
  enrichStats?: { documentsEnriched: number; summariesGenerated: number };
}

/**
 * Run a subprocess and stream its output
 */
function runScript(scriptPath: string, args: string[] = []): Promise<number> {
  return new Promise((resolve, reject) => {
    console.log(`\n📜 Running: npx tsx ${scriptPath} ${args.join(' ')}`);
    const child = spawn('npx', ['tsx', scriptPath, ...args], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env,
    });

    child.on('close', (code) => {
      resolve(code || 0);
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Phase 1: INGEST - Process raw files from source directory
 */
async function runIngestPhase(
  sourceDir: string,
): Promise<{ filesProcessed: number; errors: number }> {
  console.log('\n' + '='.repeat(70));
  console.log('📥 PHASE 1: INGEST (OCR, Extraction, Parsing)');
  console.log('='.repeat(70));
  console.log(`   Source: ${sourceDir}`);

  if (!existsSync(sourceDir)) {
    console.log(`   ⚠️  Source directory not found: ${sourceDir}`);
    return { filesProcessed: 0, errors: 0 };
  }

  const countFiles = (dir: string): number => {
    let count = 0;
    const items = readdirSync(dir);
    for (const item of items) {
      const fullPath = join(dir, item);
      if (statSync(fullPath).isDirectory()) {
        count += countFiles(fullPath);
      } else if (!item.startsWith('.')) {
        count++;
      }
    }
    return count;
  };

  const fileCount = countFiles(sourceDir);
  console.log(`   Files to process: ${fileCount}`);

  if (fileCount === 0) {
    console.log('   ⚠️  No files found to ingest');
    return { filesProcessed: 0, errors: 0 };
  }

  const exitCode = await runScript('scripts/ingest_pipeline.ts');

  return {
    filesProcessed: fileCount,
    errors: exitCode !== 0 ? 1 : 0,
  };
}

/**
 * Phase 2: INTEL - Entity extraction and relationship mapping
 */
async function runIntelPhase(): Promise<{ entitiesExtracted: number; relationsFound: number }> {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 PHASE 2: INTELLIGENCE (Entity Extraction, Relations)');
  console.log('='.repeat(70));

  const pool = getIngestPool();

  const entitiesBefore = ((await pool.query('SELECT COUNT(*) as c FROM entities')).rows[0] as any)
    .c;
  const relationsBefore = (
    (await pool.query('SELECT COUNT(*) as c FROM entity_relationships')).rows[0] as any
  ).c;

  const exitCode = await runScript('scripts/ingest_intelligence.ts');

  const entitiesAfter = ((await pool.query('SELECT COUNT(*) as c FROM entities')).rows[0] as any).c;
  const relationsAfter = (
    (await pool.query('SELECT COUNT(*) as c FROM entity_relationships')).rows[0] as any
  ).c;

  return {
    entitiesExtracted: entitiesAfter - entitiesBefore,
    relationsFound: relationsAfter - relationsBefore,
  };
}

/**
 * Phase 3: ENRICH - AI-powered enrichment for all documents
 */
async function runEnrichPhase(
  mode: 'new' | 'backfill' | 'all',
): Promise<{ documentsEnriched: number; summariesGenerated: number }> {
  console.log('\n' + '='.repeat(70));
  console.log('🤖 PHASE 3: AI ENRICHMENT (Summaries, Classification)');
  console.log('='.repeat(70));
  console.log(`   Provider: ${process.env.AI_PROVIDER}`);
  console.log(`   Mode: ${mode}`);

  const pool = getIngestPool();

  let whereClause = 'content IS NOT NULL AND length(content) > 50';
  if (mode === 'backfill') {
    whereClause += " AND (metadata_json IS NULL OR metadata_json NOT LIKE '%ai_summary%')";
  } else if (mode === 'new') {
    whereClause += " AND created_at > now() - interval '1 day'";
  }

  const totalRow = (await pool.query(`SELECT COUNT(*) as c FROM documents WHERE ${whereClause}`))
    .rows[0] as any;
  const totalDocs = totalRow?.c || 0;

  console.log(`   Documents to enrich: ${totalDocs}`);

  if (totalDocs === 0) {
    console.log('   ✅ All documents already enriched');
    return { documentsEnriched: 0, summariesGenerated: 0 };
  }

  let documentsEnriched = 0;
  let summariesGenerated = 0;
  let offset = 0;
  const startTime = Date.now();

  while (offset < totalDocs) {
    const docs = (
      await pool.query(
        `
      SELECT id, content, metadata_json, file_name
      FROM documents
      WHERE ${whereClause}
      ORDER BY id ASC
      LIMIT $1
      OFFSET $2
    `,
        [BATCH_SIZE, offset],
      )
    ).rows as any[];

    if (docs.length === 0) break;

    for (let i = 0; i < docs.length; i += CONCURRENCY) {
      const chunk = docs.slice(i, i + CONCURRENCY);

      await Promise.all(
        chunk.map(async (doc) => {
          try {
            let meta: Record<string, any> = {};
            if (doc.metadata_json) {
              try {
                meta = JSON.parse(doc.metadata_json);
              } catch {
                meta = { _original: doc.metadata_json };
              }
            }

            const subject = meta.subject || meta.title || doc.file_name || 'Unknown Document';
            let refinedText = doc.content;
            if (doc.content.includes('=')) {
              refinedText = await AIEnrichmentService.repairMimeWildcards(doc.content, subject);
            }

            let summary = await AIEnrichmentService.summarizeDocument(refinedText, {
              fileName: doc.file_name,
              subject,
            });

            if (!summary || summary.length < 10) {
              const preview = refinedText
                .replace(/[\r\n]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 200);
              summary = `Document "${doc.file_name}" summary preview: ${preview}...`;
            }

            meta.ai_summary = summary;
            meta.ai_enriched_at = new Date().toISOString();
            meta.ai_provider = process.env.AI_PROVIDER;

            await pool.query(
              'UPDATE documents SET metadata_json = $1, content_refined = $2 WHERE id = $3',
              [JSON.stringify(meta), refinedText, doc.id],
            );
            summariesGenerated++;
            documentsEnriched++;
          } catch (error) {
            console.error(`   ❌ Failed to enrich document ${doc.id}:`, error);
          }
        }),
      );

      if (documentsEnriched % 10 === 0 || documentsEnriched === totalDocs) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = documentsEnriched / elapsed;
        const eta = (totalDocs - documentsEnriched) / rate / 60;
        process.stdout.write(
          `\r   ⏳ ${documentsEnriched}/${totalDocs} (${((documentsEnriched / totalDocs) * 100).toFixed(1)}%) | ${rate.toFixed(1)} docs/s | ETA: ${eta.toFixed(1)} min`,
        );
      }
    }
    offset += BATCH_SIZE;
  }
  console.log('\n');
  return { documentsEnriched, summariesGenerated };
}

/**
 * Main orchestrator
 */
async function main() {
  const args = process.argv.slice(2);
  const modeIndex = args.indexOf('--mode');
  const sourceIndex = args.indexOf('--source');

  const mode = modeIndex >= 0 ? args[modeIndex + 1] : 'full';
  const sourceDir = sourceIndex >= 0 ? args[sourceIndex + 1] : 'data/ingest';

  console.log('\n' + '╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(20) + 'UNIFIED EVIDENCE PIPELINE' + ' '.repeat(23) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');

  const stats: PipelineStats = {
    mode,
    startTime: new Date().toISOString(),
  };

  try {
    if (mode === 'ingest' || mode === 'full') {
      stats.ingestStats = await runIngestPhase(sourceDir);
      stats.intelStats = await runIntelPhase();
    }
    if (mode === 'backfill') {
      stats.enrichStats = await runEnrichPhase('backfill');
    } else if (mode === 'ingest') {
      // intel already ran above; enrich only newly ingested docs
      stats.enrichStats = await runEnrichPhase('new');
    } else if (mode === 'full') {
      stats.enrichStats = await runEnrichPhase('all');
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ PIPELINE COMPLETE');
    console.log('='.repeat(70));

    if (!existsSync(CHECKPOINT_DIR)) {
      execSync(`mkdir -p ${CHECKPOINT_DIR}`);
    }
    writeFileSync(join(CHECKPOINT_DIR, `run_${Date.now()}.json`), JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('\n❌ Pipeline error:', error);
    process.exit(1);
  }
}

import { pathToFileURL } from 'url';
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(console.error);
}
