#!/usr/bin/env tsx
import 'dotenv/config';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { Client } from 'pg';

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://epstein:epstein@localhost:5435/epstein_archive';

const outputPath = path.resolve(process.cwd(), 'public/data/dashboard_snapshot.json');

const client = new Client({ connectionString: DATABASE_URL });

async function main() {
  await client.connect();

  const [financial, claims, counts] = await Promise.all([
    client.query(`
      SELECT
        ft.id,
        ft.from_entity,
        ft.to_entity,
        ft.amount::float8 AS amount,
        COALESCE(ft.currency, 'USD') AS currency,
        ft.transaction_date,
        COALESCE(ft.transaction_type, 'transfer') AS transaction_type,
        COALESCE(ft.method, 'wire') AS method,
        COALESCE(ft.risk_level, 'medium') AS risk_level,
        COALESCE(ft.description, '') AS description,
        ft.source_document_id,
        ft.created_at
      FROM financial_transactions ft
      ORDER BY ft.created_at DESC, ft.transaction_date DESC NULLS LAST, ft.id DESC
      LIMIT 250
    `),
    client.query(`
      SELECT
        ct.id,
        ct.document_id AS "documentId",
        ct.subject_entity_id AS "subjectEntityId",
        ct.object_entity_id AS "objectEntityId",
        ct.predicate,
        ct.object_text AS "objectText",
        trim(concat_ws(' ', s.full_name, ct.predicate, COALESCE(o.full_name, ct.object_text))) AS "claimText",
        ct.confidence,
        COALESCE(ct.modality, 'text') AS modality,
        COALESCE(ct.verified, 0) AS verified,
        ct.verified_by AS "verifiedBy",
        ct.verified_at AS "verifiedAt",
        ct.rejection_reason AS "rejectionReason",
        ct.created_at AS "createdAt",
        s.full_name AS "subjectName",
        o.full_name AS "objectName",
        COALESCE(NULLIF(d.title, ''), d.file_name) AS "documentTitle",
        ct.document_id AS "sourceDocumentId"
      FROM claim_triples ct
      LEFT JOIN entities s ON ct.subject_entity_id = s.id
      LEFT JOIN entities o ON ct.object_entity_id = o.id
      LEFT JOIN documents d ON ct.document_id = d.id
      ORDER BY ct.created_at DESC, ct.confidence DESC, ct.id DESC
      LIMIT 250
    `),
    client.query(`
      SELECT json_build_object(
        'documents', (SELECT COUNT(*) FROM documents),
        'refinedDocuments', (SELECT COUNT(*) FROM documents WHERE content_refined IS NOT NULL),
        'financialTransactions', (SELECT COUNT(*) FROM financial_transactions),
        'claimTriples', (SELECT COUNT(*) FROM claim_triples),
        'relations', (SELECT COUNT(*) FROM entity_relationships),
        'timelineEvents', (SELECT COUNT(*) FROM global_timeline_events WHERE source = 'pipeline_extract')
      ) AS counts
    `),
  ]);

  const transactions = financial.rows.map((row) => ({
    ...row,
    id: String(row.id),
    fromEntity: row.from_entity,
    toEntity: row.to_entity,
    date: row.transaction_date,
    type: row.transaction_type,
    riskLevel: row.risk_level,
    sourceDocuments: row.source_document_id ? [String(row.source_document_id)] : [],
    suspiciousIndicators: [],
  }));

  const snapshot = {
    generatedAt: new Date().toISOString(),
    source: 'postgres',
    counts: counts.rows[0]?.counts || {},
    financialTransactions: transactions,
    claimTriples: claims.rows.map((row) => ({
      ...row,
      id: String(row.id),
      documentId: String(row.documentId),
      subjectEntityId: row.subjectEntityId == null ? null : String(row.subjectEntityId),
      objectEntityId: row.objectEntityId == null ? null : String(row.objectEntityId),
      sourceDocumentId: row.sourceDocumentId == null ? null : Number(row.sourceDocumentId),
      extractionMethod: 'agentic',
      reviewState: row.verified === 1 ? 'accepted' : row.verified === 2 ? 'rejected' : 'unreviewed',
      provenanceStatus: 'partial',
    })),
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(
    `Wrote ${snapshot.claimTriples.length} claims and ${snapshot.financialTransactions.length} financial transactions to ${outputPath}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => undefined);
  });
