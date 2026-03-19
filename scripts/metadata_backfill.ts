#!/usr/bin/env tsx
import { getMaintenancePool } from '../src/server/db/connection.js';
import { discoveryRepository } from '../src/server/db/discoveryRepository.js';
import { RedactionClassifier } from '../src/server/services/RedactionClassifier.js';
import { TextCleaner } from './utils/text_cleaner.js';
import pg from 'pg';
import 'dotenv/config';

const BATCH_SIZE = 500;

async function backfill() {
  const pool = getMaintenancePool();
  console.log('Starting Metadata Backfill for Legacy Documents...');

  let processedCount = 0;
  let hasMore = true;

  while (hasMore) {
    const docsResult = await pool.query(
      `
      SELECT id, content, file_path, evidence_type
      FROM documents
      WHERE signal_score IS NULL AND content IS NOT NULL
      LIMIT $1
    `,
      [BATCH_SIZE],
    );
    const docs = docsResult.rows;

    if (docs.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`Processing batch of ${docs.length} documents...`);

    for (const doc of docs) {
      try {
        await processDocumentBackfill(pool, doc);
        processedCount++;
        if (processedCount % 100 === 0) {
          process.stdout.write(`   Progress: ${processedCount} documents...\r`);
        }
      } catch (err) {
        console.error(`\nError processing document ${doc.id}:`, err);
      }
    }
  }

  console.log(`\nBackfill complete! Total processed: ${processedCount}`);
}

async function processDocumentBackfill(pool: pg.Pool, doc: any) {
  const raw = doc.content;
  const content =
    doc.evidence_type === 'email' ? TextCleaner.cleanEmailText(raw) : TextCleaner.cleanOcrText(raw);
  const sentences = content
    .split(/(?<=[.!?])\s+/)
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 10);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM document_sentences WHERE document_id = $1', [doc.id]);
    await client.query('DELETE FROM redaction_spans WHERE document_id = $1', [doc.id]);

    for (let i = 0; i < sentences.length; i++) {
      await discoveryRepository.addSentence({
        document_id: doc.id,
        sentence_index: i,
        sentence_text: sentences[i],
      });
    }

    await storeRedactions(client, doc.id, content);
    await rollupScores(client, doc.id);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function storeRedactions(client: pg.PoolClient, documentId: number, content: string) {
  const insertSpanSql = `
    INSERT INTO redaction_spans (
      document_id, span_start, span_end, redaction_kind,
      inferred_class, inferred_role, confidence, evidence_json
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `;

  const redactedPattern =
    /(REDACTED|Media Redacted|Excerpt Redacted|Redacted|redacted|Privileged - Redacted)/gi;
  let match;
  let count = 0;
  while ((match = redactedPattern.exec(content)) !== null) {
    count++;
    const start = match.index;
    const end = match.index + match[0].length;
    const pre = content.substring(Math.max(0, start - 100), start);
    const post = content.substring(end, end + 100);
    const inference = RedactionClassifier.classify(pre, post);

    await client.query(insertSpanSql, [
      documentId,
      start,
      end,
      'removed_text',
      inference.inferredClass,
      inference.inferredRole,
      inference.confidence,
      JSON.stringify(inference.evidence),
    ]);
  }

  if (count > 0) {
    await client.query(
      'UPDATE documents SET has_redactions = true, redaction_count = $1 WHERE id = $2',
      [count, documentId],
    );
    console.log(`\n      Stored ${count} redactions for doc ${documentId}`);
  }
}

async function rollupScores(client: pg.PoolClient, docId: number) {
  await client.query(
    `
    UPDATE document_sentences SET signal_score = 0.7
    WHERE document_id = $1 AND is_boilerplate = false
  `,
    [docId],
  );

  await client.query(
    `
    UPDATE document_sentences SET signal_score = 0.1
    WHERE document_id = $1 AND is_boilerplate = true
  `,
    [docId],
  );

  const statsResult = await client.query(
    `
    SELECT AVG(signal_score) as avg_score FROM document_sentences WHERE document_id = $1
  `,
    [docId],
  );

  const avgScore = (statsResult.rows[0] as any)?.avg_score ?? 0.0;

  await client.query('UPDATE documents SET signal_score = $1, analyzed_at = NOW() WHERE id = $2', [
    avgScore,
    docId,
  ]);
}

backfill().catch((e) => {
  console.error(e);
  process.exit(1);
});
