#!/usr/bin/env tsx
/**
 * Phase 4d: Extract claim triples (subject-predicate-object) from enriched documents.
 * Writes to: claim_triples
 * Tracking: documents.metadata_json.graph_triples_at
 */

import { getIngestPool } from '../src/server/db/connection.js';
import { AIEnrichmentService } from '../src/server/services/AIEnrichmentService.js';
import 'dotenv/config';

const BATCH_SIZE = parseInt(process.env.GRAPH_BATCH_SIZE || '50', 10);
const MIN_CONFIDENCE = 0.6;

const VALID_MODALITY = new Set(['ASSERTED', 'ALLEGED', 'DENIED', 'UNKNOWN']);

async function main() {
  if (process.env.ENABLE_AI_ENRICHMENT !== 'true') {
    console.log('ℹ️  ENABLE_AI_ENRICHMENT not set — skipping claim triple extraction');
    process.exit(0);
  }

  if (!process.env.AI_PROVIDER) {
    process.env.AI_PROVIDER = 'exo_cluster';
  }

  const pool = getIngestPool();
  let processed = 0;
  let triplesAdded = 0;

  console.log('\n' + '='.repeat(70));
  console.log('🧩 PHASE 4d: CLAIM TRIPLE EXTRACTION');
  console.log('='.repeat(70));

  for (;;) {
    const { rows: docs } = await pool.query<{
      id: number;
      content_refined: string;
    }>(
      `
      SELECT id, content_refined
      FROM documents
      WHERE content_refined IS NOT NULL
        AND (
          metadata_json IS NULL
          OR metadata_json->>'graph_triples_at' IS NULL
          OR NOT EXISTS (
            SELECT 1
            FROM claim_triples ct
            WHERE ct.document_id = documents.id
          )
        )
        AND (metadata_json IS NULL OR metadata_json->>'graph_triples_empty_at' IS NULL)
      ORDER BY id ASC
      LIMIT $1
    `,
      [BATCH_SIZE],
    );

    if (docs.length === 0) break;

    for (const doc of docs) {
      try {
        const { rows: mentions } = await pool.query<{ full_name: string; entity_id: number }>(
          `
          SELECT DISTINCT e.full_name, e.id AS entity_id
          FROM entity_mentions em
          JOIN entities e ON e.id = em.entity_id
          WHERE em.document_id = $1 AND e.full_name IS NOT NULL
          LIMIT 30
        `,
          [doc.id],
        );

        const entityNames = mentions.map((m) => m.full_name);
        const nameToId = new Map(mentions.map((m) => [m.full_name.toLowerCase(), m.entity_id]));

        let triples = await AIEnrichmentService.extractClaimTriples(
          doc.content_refined,
          entityNames,
        );

        if (triples.length === 0) {
          // Retry with a focused excerpt that prioritises allegation-bearing sentences
          const focusedExcerpt = AIEnrichmentService.buildClaimExcerptForRetry(
            doc.content_refined,
            entityNames,
          );
          triples = await AIEnrichmentService.extractClaimTriples(focusedExcerpt, entityNames);
        }

        if (triples.length === 0) {
          console.warn(`   ⚠️  Doc ${doc.id}: AI returned no claim triples after retry`);
        }

        let triplesAddedForDoc = 0;
        const seenTriples = new Set<string>();

        for (const triple of triples) {
          const rawConfidence = Number(triple.confidence);
          const confidence = Number.isFinite(rawConfidence)
            ? Math.min(1.0, Math.max(0.0, rawConfidence))
            : 0.75;
          if (confidence < MIN_CONFIDENCE) continue;

          const modality = VALID_MODALITY.has((triple.modality || '').toUpperCase())
            ? triple.modality.toUpperCase()
            : 'UNKNOWN';

          // Try to resolve subject/object to entity IDs
          const subjectLower = triple.subject.toLowerCase();
          const objectLower = triple.object.toLowerCase();
          const tripleKey = `${subjectLower}|${String(triple.predicate).toLowerCase()}|${objectLower}`;
          if (seenTriples.has(tripleKey)) continue;
          seenTriples.add(tripleKey);

          const subjectId =
            nameToId.get(subjectLower) ??
            mentions.find((m) => m.full_name.toLowerCase().includes(subjectLower.split(' ')[0]))
              ?.entity_id ??
            null;

          const objectId =
            nameToId.get(objectLower) ??
            mentions.find((m) => m.full_name.toLowerCase().includes(objectLower.split(' ')[0]))
              ?.entity_id ??
            null;

          await pool.query(
            `
            INSERT INTO claim_triples
              (subject_entity_id, predicate, object_entity_id, object_text,
               document_id, confidence, modality)
            VALUES ($1::bigint, $2, $3::bigint, $4, $5, $6, $7)
          `,
            [
              subjectId,
              String(triple.predicate).slice(0, 255),
              objectId,
              String(triple.object).slice(0, 500),
              doc.id,
              confidence,
              modality,
            ],
          );

          triplesAdded++;
          triplesAddedForDoc++;
        }

        if (triplesAddedForDoc > 0) {
          await pool.query(
            `
            UPDATE documents
            SET metadata_json =
              (COALESCE(metadata_json, '{}'::jsonb) - 'graph_triples_empty_at' - 'graph_triples_error_at')
              || jsonb_build_object('graph_triples_at', $1::text)
            WHERE id = $2::bigint
          `,
            [new Date().toISOString(), doc.id],
          );
        } else {
          await pool.query(
            `
            UPDATE documents
            SET metadata_json =
              (COALESCE(metadata_json, '{}'::jsonb) - 'graph_triples_at' - 'graph_triples_error_at')
              || jsonb_build_object('graph_triples_empty_at', $1::text)
            WHERE id = $2::bigint
          `,
            [new Date().toISOString(), doc.id],
          );
        }

        processed++;
        if (processed % 100 === 0) {
          process.stdout.write(`\r   ⏳ ${processed} docs | ${triplesAdded} triples`);
        }
      } catch (err) {
        console.error(`   ❌ Doc ${doc.id}:`, (err as Error).message);
        await pool.query(
          `
          UPDATE documents
          SET metadata_json =
            (COALESCE(metadata_json, '{}'::jsonb) - 'graph_triples_at')
            || jsonb_build_object('graph_triples_error_at', $1::text)
          WHERE id = $2::bigint
        `,
          [new Date().toISOString(), doc.id],
        );
      }
    }
  }

  console.log(`\n   ✅ Done — ${processed} docs, ${triplesAdded} triples written`);
  await pool.end();
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
