#!/usr/bin/env tsx
/**
 * Phase 4b: Extract dated timeline events from enriched documents.
 * Writes to: global_timeline_events (source = 'pipeline_extract')
 * Tracking: documents.metadata_json.graph_timeline_at
 */

import { getIngestPool } from '../src/server/db/connection.js';
import { AIEnrichmentService } from '../src/server/services/AIEnrichmentService.js';
import 'dotenv/config';

const BATCH_SIZE = parseInt(process.env.GRAPH_BATCH_SIZE || '50', 10);

const VALID_TYPES = new Set([
  'LEGAL',
  'FINANCIAL',
  'POLITICAL',
  'TRAVEL',
  'MEETING',
  'COMMUNICATION',
  'OTHER',
]);
const VALID_SIGNIFICANCE = new Set(['HIGH', 'MEDIUM', 'LOW']);

function sanitizeDate(d: string): string | null {
  // Accept YYYY-MM-DD or YYYY-MM or YYYY; normalize to YYYY-MM-DD
  const m = String(d).match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  if (year < 1900 || year > 2030) return null;
  const month = m[2] ? m[2].padStart(2, '0') : '01';
  const day = m[3] ? m[3].padStart(2, '0') : '01';
  return `${m[1]}-${month}-${day}`;
}

async function main() {
  if (process.env.ENABLE_AI_ENRICHMENT !== 'true') {
    console.log('ℹ️  ENABLE_AI_ENRICHMENT not set — skipping timeline extraction');
    process.exit(0);
  }

  const pool = getIngestPool();
  let processed = 0;
  let eventsAdded = 0;

  console.log('\n' + '='.repeat(70));
  console.log('📅 PHASE 4b: TIMELINE EVENT EXTRACTION');
  console.log('='.repeat(70));

  for (;;) {
    const { rows: docs } = await pool.query<{
      id: number;
      content_refined: string;
      file_name: string;
    }>(
      `
      SELECT id, content_refined, file_name
      FROM documents
      WHERE content_refined IS NOT NULL
        AND (metadata_json IS NULL OR metadata_json->>'graph_timeline_at' IS NULL)
      ORDER BY id ASC
      LIMIT $1
    `,
      [BATCH_SIZE],
    );

    if (docs.length === 0) break;

    for (const doc of docs) {
      try {
        const events = await AIEnrichmentService.extractTimelineEvents(
          doc.content_refined,
          doc.file_name || '',
        );

        for (const ev of events) {
          const date = sanitizeDate(ev.date);
          if (!date) continue;

          const type = VALID_TYPES.has((ev.type || '').toUpperCase())
            ? ev.type.toUpperCase()
            : 'OTHER';
          const significance = VALID_SIGNIFICANCE.has((ev.significance || '').toUpperCase())
            ? ev.significance.toUpperCase()
            : 'MEDIUM';

          await pool.query(
            `
            INSERT INTO global_timeline_events
              (title, date, description, type, significance, entities, related_document_id, source)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pipeline_extract')
            ON CONFLICT DO NOTHING
          `,
            [
              String(ev.title).slice(0, 255),
              date,
              String(ev.description || '').slice(0, 1000),
              type,
              significance,
              String(ev.entities || '').slice(0, 500),
              doc.id,
            ],
          );

          eventsAdded++;
        }

        await pool.query(
          `
          UPDATE documents
          SET metadata_json = COALESCE(metadata_json, '{}'::jsonb) || jsonb_build_object('graph_timeline_at', $1::text)
          WHERE id = $2
        `,
          [new Date().toISOString(), doc.id],
        );

        processed++;
        if (processed % 100 === 0) {
          process.stdout.write(`\r   ⏳ ${processed} docs | ${eventsAdded} events`);
        }
      } catch (err) {
        console.error(`   ❌ Doc ${doc.id}:`, (err as Error).message);
        await pool.query(
          `
          UPDATE documents
          SET metadata_json = COALESCE(metadata_json, '{}'::jsonb) || jsonb_build_object('graph_timeline_at', $1::text)
          WHERE id = $2
        `,
          [new Date().toISOString(), doc.id],
        );
      }
    }
  }

  console.log(`\n   ✅ Done — ${processed} docs, ${eventsAdded} events written`);
  await pool.end();
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
