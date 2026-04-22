#!/usr/bin/env tsx
/**
 * Phase 4a: Extract directed relations between entities from enriched documents.
 * Writes to: relations, relation_evidence
 * Tracking: documents.metadata_json.graph_relations_at
 */

import * as crypto from 'crypto';
import { getIngestPool } from '../src/server/db/connection.js';
import { AIEnrichmentService } from '../src/server/services/AIEnrichmentService.js';
import 'dotenv/config';

const BATCH_SIZE = parseInt(process.env.GRAPH_BATCH_SIZE || '50', 10);

function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 40);
}

async function main() {
  if (process.env.ENABLE_AI_ENRICHMENT !== 'true') {
    console.log('ℹ️  ENABLE_AI_ENRICHMENT not set — skipping relation extraction');
    process.exit(0);
  }

  const pool = getIngestPool();
  let processed = 0;
  let relationsAdded = 0;

  console.log('\n' + '='.repeat(70));
  console.log('🔗 PHASE 4a: DIRECTED RELATIONS EXTRACTION');
  console.log('='.repeat(70));

  for (;;) {
    // Fetch a batch of enriched docs not yet relation-extracted
    const { rows: docs } = await pool.query<{
      id: number;
      content_refined: string;
      file_name: string;
    }>(
      `
      SELECT id, content_refined, file_name
      FROM documents
      WHERE content_refined IS NOT NULL
        AND (metadata_json IS NULL OR metadata_json->>'graph_relations_at' IS NULL)
      ORDER BY id ASC
      LIMIT $1
    `,
      [BATCH_SIZE],
    );

    if (docs.length === 0) break;

    for (const doc of docs) {
      try {
        // Get entity names mentioned in this document
        const { rows: mentions } = await pool.query<{ full_name: string; entity_id: number }>(
          `
          SELECT DISTINCT e.full_name, e.id AS entity_id
          FROM entity_mentions em
          JOIN entities e ON e.id = em.entity_id
          WHERE em.document_id = $1
            AND e.full_name IS NOT NULL
        `,
          [doc.id],
        );

        if (mentions.length >= 2) {
          const entityNames = mentions.map((m) => m.full_name);
          const nameToId = new Map(mentions.map((m) => [m.full_name.toLowerCase(), m.entity_id]));

          // Extract up to 3 paragraphs to keep LLM calls focused
          const paragraphs = doc.content_refined
            .split(/\n{2,}/)
            .filter((p) => p.trim().length > 80)
            .slice(0, 3);

          for (const paragraph of paragraphs) {
            const relationships = await AIEnrichmentService.extractRelationships(
              paragraph,
              entityNames,
            );

            for (const rel of relationships) {
              const subjectId =
                nameToId.get(rel.source.toLowerCase()) ??
                mentions.find((m) =>
                  m.full_name.toLowerCase().includes(rel.source.toLowerCase().split(' ')[0]),
                )?.entity_id;
              const objectId =
                nameToId.get(rel.target.toLowerCase()) ??
                mentions.find((m) =>
                  m.full_name.toLowerCase().includes(rel.target.toLowerCase().split(' ')[0]),
                )?.entity_id;

              if (!subjectId || !objectId || subjectId === objectId) continue;

              const relationId = sha256(`${subjectId}|${rel.relationship}|${objectId}`);

              await pool.query(
                `
                INSERT INTO relations (id, subject_entity_id, object_entity_id, predicate, direction, weight, last_seen_at)
                VALUES ($1, $2, $3, $4, 'directed', $5, NOW())
                ON CONFLICT (id) DO UPDATE
                  SET last_seen_at = NOW(),
                      weight = LEAST(relations.weight + 0.1, 10.0)
              `,
                [relationId, subjectId, objectId, rel.relationship, rel.confidence],
              );

              const evidenceId = sha256(`${relationId}|${doc.id}|${paragraph.slice(0, 40)}`);
              await pool.query(
                `
                INSERT INTO relation_evidence (id, relation_id, document_id, confidence, quote_text)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (id) DO NOTHING
              `,
                [evidenceId, relationId, doc.id, rel.confidence, paragraph.slice(0, 500)],
              );

              // Also write into entity_relationships — this is the table the UI reads
              // (NetworkGraph, /api/relationships, analyticsRepository all query here)
              await pool.query(
                `
                INSERT INTO entity_relationships
                  (source_entity_id, target_entity_id, relationship_type,
                   strength, confidence, was_agentic, first_seen_at, last_seen_at)
                VALUES ($1, $2, $3, $4, $5, 1, NOW(), NOW())
                ON CONFLICT (source_entity_id, target_entity_id, relationship_type) DO UPDATE
                  SET strength      = LEAST(entity_relationships.strength + 0.05, 1.0),
                      confidence    = GREATEST(entity_relationships.confidence, $5),
                      last_seen_at  = NOW()
              `,
                [subjectId, objectId, rel.relationship, rel.confidence, rel.confidence],
              );

              relationsAdded++;
            }
          }
        }

        // Mark document as processed
        await pool.query(
          `
          UPDATE documents
          SET metadata_json = COALESCE(metadata_json, '{}'::jsonb) || jsonb_build_object('graph_relations_at', $1::text)
          WHERE id = $2::bigint
        `,
          [new Date().toISOString(), doc.id],
        );

        processed++;
        if (processed % 100 === 0) {
          process.stdout.write(`\r   ⏳ ${processed} docs | ${relationsAdded} relations`);
        }
      } catch (err) {
        console.error(`   ❌ Doc ${doc.id}:`, (err as Error).message);
        // Mark as processed anyway so we don't retry indefinitely on parse errors
        await pool.query(
          `
          UPDATE documents
          SET metadata_json = COALESCE(metadata_json, '{}'::jsonb) || jsonb_build_object('graph_relations_at', $1::text)
          WHERE id = $2::bigint
        `,
          [new Date().toISOString(), doc.id],
        );
      }
    }
  }

  console.log(`\n   ✅ Done — ${processed} docs, ${relationsAdded} relations written`);
  await pool.end();
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
