import 'dotenv/config';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { Pool, type PoolClient } from 'pg';
import {
  AIEnrichmentService,
  type RedactionContextCandidate,
} from '../src/server/services/AIEnrichmentService.js';

const execFileAsync = promisify(execFile);
const SCANNER_VERSION = 'redaction-intelligence-v1';
const BATCH_SIZE = Math.max(1, Number(process.env.REDACTION_BACKFILL_BATCH || 100));
const MAX_DOCUMENTS = Math.max(0, Number(process.env.REDACTION_BACKFILL_MAX || 0));
const TARGET_DOCUMENT_ID = process.env.REDACTION_BACKFILL_DOCUMENT_ID || null;
const CONCURRENCY = Math.max(1, Math.min(16, Number(process.env.REDACTION_BACKFILL_WORKERS || 4)));
const modeArg = process.argv.find((value) => value.startsWith('--mode='))?.split('=')[1] || 'all';
const mode = modeArg === 'overlay' || modeArg === 'context' ? modeArg : 'all';
const managedPython = join(process.cwd(), '.venv', 'bin', 'python');
const pythonBin =
  process.env.PIPELINE_PYTHON || (existsSync(managedPython) ? managedPython : 'python3');

type DocumentRow = {
  id: string;
  file_path: string | null;
  content: string | null;
  content_refined: string | null;
  content_hash: string | null;
};

type OverlayFinding = {
  kind: 'overlay_text_exposed';
  page: number;
  text: string;
  bbox: number[];
  redaction_bbox?: number[];
  confidence: number;
  evidence: string[];
  method: string;
};

const redactionPattern = /\[(?:REDACTED|Media Redacted|Excerpt Redacted)\]/gi;
const identifierPattern = /\b(?:[A-Z]{2,8}\d{4,}|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})\b/g;

async function scanPdf(filePath: string): Promise<OverlayFinding[]> {
  const outputDir = await mkdtemp(join(tmpdir(), 'redaction-scan-'));
  try {
    await execFileAsync(
      pythonBin,
      [join(process.cwd(), 'scripts/unredact.py'), '-i', filePath, '-o', outputDir],
      { maxBuffer: 2 * 1024 * 1024 },
    );
    const stem = basename(filePath).replace(/\.pdf$/i, '');
    const payload = JSON.parse(
      await readFile(join(outputDir, `${stem}_UNREDACTED.json`), 'utf8'),
    ) as { spans?: OverlayFinding[] };
    return Array.isArray(payload.spans) ? payload.spans : [];
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
}

function resolveCorpusPath(filePath: string): string {
  if (isAbsolute(filePath)) return filePath;
  const candidates = [resolve(process.cwd(), filePath)];
  if (process.cwd().includes(`${join('.worktrees', '')}`)) {
    candidates.push(resolve(process.cwd(), '..', '..', filePath));
  }
  const configuredRoot = process.env.RAW_CORPUS_BASE_PATH;
  if (configuredRoot) {
    const withoutDataPrefix = filePath.replace(/^data[/\\]/, '');
    candidates.push(resolve(configuredRoot, withoutDataPrefix));
  }
  return candidates.find(existsSync) || candidates[0];
}

async function storeOverlayFindings(pool: Pool, document: DocumentRow): Promise<void> {
  if (!document.file_path || !document.file_path.toLowerCase().endsWith('.pdf')) return;
  let client: PoolClient | null = null;
  try {
    const findings = await scanPdf(resolveCorpusPath(document.file_path));
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(
      "DELETE FROM redaction_findings WHERE document_id = $1 AND method = 'pdf_object_order_v2'",
      [document.id],
    );
    for (const finding of findings) {
      await client.query(
        `INSERT INTO redaction_findings (
           document_id, page_number, finding_type, source_text, bbox_json, confidence,
           evidence_json, method, source_sha256
         ) VALUES ($1, $2, 'overlay_text_exposed', $3, $4, $5, $6, $7, $8)`,
        [
          document.id,
          finding.page,
          finding.text,
          JSON.stringify({ text: finding.bbox, overlay: finding.redaction_bbox || null }),
          finding.confidence,
          JSON.stringify(finding.evidence),
          finding.method,
          document.content_hash,
        ],
      );
    }
    await client.query(
      `INSERT INTO redaction_document_scans (
         document_id, source_sha256, overlay_scanned_at, scanner_version, error_text
       ) VALUES ($1, $2, NOW(), $3, NULL)
       ON CONFLICT (document_id) DO UPDATE SET
         source_sha256 = EXCLUDED.source_sha256,
         overlay_scanned_at = EXCLUDED.overlay_scanned_at,
         scanner_version = EXCLUDED.scanner_version,
         error_text = NULL,
         updated_at = NOW()`,
      [document.id, document.content_hash, SCANNER_VERSION],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client?.query('ROLLBACK').catch(() => undefined);
    await pool.query(
      `INSERT INTO redaction_document_scans (document_id, scanner_version, error_text)
       VALUES ($1, $2, $3)
       ON CONFLICT (document_id) DO UPDATE SET error_text = EXCLUDED.error_text, updated_at = NOW()`,
      [document.id, SCANNER_VERSION, String(error).slice(0, 1000)],
    );
  } finally {
    client?.release();
  }
}

async function candidatesForDocument(
  client: Pool,
  documentId: string,
  content: string,
): Promise<RedactionContextCandidate[]> {
  const result = await client.query<{
    id: string;
    full_name: string;
    document_count: string;
  }>(
    `WITH linked AS (
       SELECT DISTINCT em.entity_id
       FROM entity_mentions em
       WHERE em.document_id = $1
       LIMIT 100
     )
     SELECT e.id::text, e.full_name, counts.document_count::text
     FROM linked
     JOIN entities e ON e.id = linked.entity_id
     CROSS JOIN LATERAL (
       SELECT COUNT(DISTINCT all_em.document_id) AS document_count
       FROM entity_mentions all_em
       WHERE all_em.entity_id = e.id
     ) counts
     WHERE COALESCE(e.full_name, '') <> ''
       AND LOWER(COALESCE(e.entity_category, '')) NOT IN ('victim', 'survivor', 'minor')
     ORDER BY counts.document_count DESC
     LIMIT 35`,
    [documentId],
  );
  const names: RedactionContextCandidate[] = result.rows.map((row) => ({
    value: row.full_name,
    category: 'name',
    entityId: row.id,
    corroboratingDocumentCount: Number(row.document_count || 0),
  }));
  const identifiers = [...new Set(content.match(identifierPattern) || [])]
    .slice(0, 15)
    .map((value) => ({
      value,
      category: 'identifier' as const,
      entityId: null,
      corroboratingDocumentCount: 1,
    }));
  return [...names, ...identifiers];
}

async function storeContextFindings(pool: Pool, document: DocumentRow): Promise<void> {
  const content = (document.content_refined || document.content || '').trim();
  const matches = [...content.matchAll(redactionPattern)];
  if (matches.length === 0) return;
  const candidates = await candidatesForDocument(pool, document.id, content);
  const prepared = [];
  for (const match of matches.slice(0, 100)) {
    const start = match.index || 0;
    const end = start + match[0].length;
    const pre = content.slice(Math.max(0, start - 700), start);
    const post = content.slice(end, end + 700);
    const inference = await AIEnrichmentService.inferRedactionCandidate(pre, post, candidates);
    prepared.push({ match, start, end, inference });
  }
  const client = await pool.connect();
  await client.query('BEGIN');
  try {
    await client.query(
      "DELETE FROM redaction_findings WHERE document_id = $1 AND method IN ('context_classifier_v2', 'exo_closed_candidate_v1')",
      [document.id],
    );
    for (const { match, start, end, inference } of prepared) {
      const selected = inference
        ? [
            {
              ...inference.candidate,
              confidence: inference.confidence,
              rationale: inference.rationale,
            },
          ]
        : [];
      await client.query(
        `INSERT INTO redaction_findings (
           document_id, span_start, span_end, finding_type, source_text, candidates_json,
           confidence, evidence_json, method, model_id, prompt_version, source_sha256
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          document.id,
          start,
          end,
          inference ? 'contextual_hypothesis' : 'unresolved_redaction',
          match[0],
          JSON.stringify(selected),
          inference?.confidence || 0,
          JSON.stringify([
            'candidate restricted to names or identifiers already linked to this document',
            'requires source review and independent corroboration',
          ]),
          inference ? 'exo_closed_candidate_v1' : 'context_classifier_v2',
          inference?.modelId || null,
          inference?.promptVersion || 'redaction-context-v1',
          document.content_hash,
        ],
      );
    }
    await client.query(
      `INSERT INTO redaction_document_scans (
         document_id, source_sha256, context_scanned_at, scanner_version, error_text
       ) VALUES ($1, $2, NOW(), $3, NULL)
       ON CONFLICT (document_id) DO UPDATE SET
         source_sha256 = EXCLUDED.source_sha256,
         context_scanned_at = EXCLUDED.context_scanned_at,
         scanner_version = EXCLUDED.scanner_version,
         error_text = NULL,
         updated_at = NOW()`,
      [document.id, document.content_hash, SCANNER_VERSION],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function runWorkers(
  documents: DocumentRow[],
  task: (document: DocumentRow) => Promise<void>,
) {
  let cursor = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < documents.length) {
      const document = documents[cursor++];
      await task(document);
    }
  });
  await Promise.all(workers);
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  if (mode === 'overlay' || mode === 'all') {
    await execFileAsync(pythonBin, ['-c', 'import pymupdf'], { timeout: 15_000 }).catch(() => {
      throw new Error('PyMuPDF is required. Run "pnpm pipeline:python:setup" first.');
    });
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: CONCURRENCY + 2 });
  try {
    let processed = 0;
    while (MAX_DOCUMENTS === 0 || processed < MAX_DOCUMENTS) {
      const remaining =
        MAX_DOCUMENTS === 0 ? BATCH_SIZE : Math.min(BATCH_SIZE, MAX_DOCUMENTS - processed);
      const predicate =
        mode === 'context'
          ? "COALESCE(d.content_refined, d.content, '') ~* '\\[(REDACTED|Media Redacted|Excerpt Redacted)\\]' AND s.context_scanned_at IS NULL AND s.error_text IS NULL"
          : "LOWER(COALESCE(d.file_path, '')) LIKE '%.pdf' AND s.overlay_scanned_at IS NULL AND s.error_text IS NULL";
      const result = await pool.query<DocumentRow>(
        `SELECT d.id::text, d.file_path, d.content, d.content_refined, d.content_hash
         FROM documents d
         LEFT JOIN redaction_document_scans s ON s.document_id = d.id
         WHERE ${predicate}
           AND ($2::bigint IS NULL OR d.id = $2::bigint)
         ORDER BY d.id
         LIMIT $1`,
        [remaining, TARGET_DOCUMENT_ID],
      );
      if (result.rows.length === 0) break;
      await runWorkers(result.rows, async (document) => {
        if (mode === 'overlay' || mode === 'all') await storeOverlayFindings(pool, document);
        if (mode === 'context' || mode === 'all') await storeContextFindings(pool, document);
      });
      processed += result.rows.length;
      console.log(`[redactions] processed ${processed} documents`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[redactions] backfill failed:', error);
  process.exitCode = 1;
});
