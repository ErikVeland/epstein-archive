#!/usr/bin/env tsx
/**
 * Phase 4c: Extract financial transactions from enriched documents.
 * Writes to: financial_transactions
 * Tracking: documents.metadata_json.graph_financial_at
 */

import { getIngestPool } from '../src/server/db/connection.js';
import { AIEnrichmentService } from '../src/server/services/AIEnrichmentService.js';
import 'dotenv/config';

const BATCH_SIZE = parseInt(process.env.GRAPH_BATCH_SIZE || '50', 10);

const VALID_TX_TYPES = new Set([
  'PAYMENT',
  'TRANSFER',
  'GIFT',
  'LOAN',
  'INVESTMENT',
  'SALARY',
  'EXPENSE',
  'OTHER',
]);
const VALID_METHODS = new Set(['CASH', 'WIRE', 'CHECK', 'CRYPTO', 'UNKNOWN']);
const VALID_RISK = new Set(['HIGH', 'MEDIUM', 'LOW']);

function sanitizeDate(d: string): string | null {
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
    console.log('ℹ️  ENABLE_AI_ENRICHMENT not set — skipping financial transaction extraction');
    process.exit(0);
  }

  if (!process.env.AI_PROVIDER) {
    process.env.AI_PROVIDER = 'exo_cluster';
  }

  const pool = getIngestPool();
  let processed = 0;
  let txAdded = 0;

  console.log('\n' + '='.repeat(70));
  console.log('💰 PHASE 4c: FINANCIAL TRANSACTION EXTRACTION');
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
        AND (metadata_json IS NULL OR metadata_json->>'graph_financial_at' IS NULL)
      ORDER BY id ASC
      LIMIT $1
    `,
      [BATCH_SIZE],
    );

    if (docs.length === 0) break;

    for (const doc of docs) {
      try {
        const { rows: mentions } = await pool.query<{ full_name: string }>(
          `
          SELECT DISTINCT e.full_name
          FROM entity_mentions em
          JOIN entities e ON e.id = em.entity_id
          WHERE em.document_id = $1 AND e.full_name IS NOT NULL
          LIMIT 30
        `,
          [doc.id],
        );

        const entityNames = mentions.map((m) => m.full_name);

        const transactions = await AIEnrichmentService.extractFinancialTransactions(
          doc.content_refined,
          entityNames,
        );

        for (const tx of transactions) {
          const date = sanitizeDate(tx.date);
          if (!date) continue;

          const amount = isFinite(Number(tx.amount)) ? Number(tx.amount) : 0;
          if (amount <= 0) continue;

          const txType = VALID_TX_TYPES.has((tx.transaction_type || '').toUpperCase())
            ? tx.transaction_type.toUpperCase()
            : 'OTHER';
          const method = VALID_METHODS.has((tx.method || '').toUpperCase())
            ? tx.method.toUpperCase()
            : 'UNKNOWN';
          const risk = VALID_RISK.has((tx.risk_level || '').toUpperCase())
            ? tx.risk_level.toUpperCase()
            : 'MEDIUM';

          await pool.query(
            `
            INSERT INTO financial_transactions
              (from_entity, to_entity, amount, currency, transaction_date,
               transaction_type, method, risk_level, description, source_document_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `,
            [
              String(tx.from_entity).slice(0, 255),
              String(tx.to_entity).slice(0, 255),
              amount,
              String(tx.currency || 'USD').slice(0, 10),
              date,
              txType,
              method,
              risk,
              String(tx.description || '').slice(0, 500),
              doc.id,
            ],
          );

          txAdded++;
        }

        await pool.query(
          `
          UPDATE documents
          SET metadata_json = COALESCE(metadata_json, '{}'::jsonb) || jsonb_build_object('graph_financial_at', $1::text)
          WHERE id = $2
        `,
          [new Date().toISOString(), doc.id],
        );

        processed++;
        if (processed % 100 === 0) {
          process.stdout.write(`\r   ⏳ ${processed} docs | ${txAdded} transactions`);
        }
      } catch (err) {
        console.error(`   ❌ Doc ${doc.id}:`, (err as Error).message);
        await pool.query(
          `
          UPDATE documents
          SET metadata_json = COALESCE(metadata_json, '{}'::jsonb) || jsonb_build_object('graph_financial_at', $1::text)
          WHERE id = $2
        `,
          [new Date().toISOString(), doc.id],
        );
      }
    }
  }

  console.log(`\n   ✅ Done — ${processed} docs, ${txAdded} transactions written`);
  await pool.end();
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
