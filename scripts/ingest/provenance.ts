// ============================================================================
// PROVENANCE — pHash generation, unredaction, redaction storage
// ============================================================================

import { join, basename, extname, isAbsolute, resolve as resolvePath } from 'path';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, copyFileSync } from 'fs';
import * as fs from 'fs';
import { tmpdir } from 'os';
import { execFile } from 'child_process';
import sharp from 'sharp';
import { TextCleaner } from '../utils/text_cleaner.js';
import { AIEnrichmentService } from '../../src/server/services/AIEnrichmentService.js';
import {
  RedactionClassifier,
  type RedactionInference,
} from '../../src/server/services/RedactionClassifier.js';
import type { IngestContext } from './context.js';
import type { OverlayTextFinding, UnredactionResult } from './types.js';

export function deriveMediaTitle(filePath: string, collectionName: string): string {
  const filename = basename(filePath, extname(filePath));
  const normalizedCollection = collectionName.trim().toLowerCase();

  if (normalizedCollection === 'sascha riley tiktok q&a') {
    return 'Sascha Riley TikTok Q&A';
  }

  return filename.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || basename(filePath);
}

/**
 * Generates a 64-bit pHash (Average Hash) for an image using sharp.
 */
export async function generatePhash(
  filePath: string,
  auditRecordError: (type: string, message: string) => void,
): Promise<string> {
  try {
    const { data } = await sharp(filePath)
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const avg = data.reduce((sum, val) => sum + val, 0) / 64;
    let hash = '';
    for (let i = 0; i < 64; i++) {
      hash += data[i] >= avg ? '1' : '0';
    }
    // Convert to hex for storage
    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      hex += parseInt(hash.substring(i, i + 4), 2).toString(16);
    }
    return hex;
  } catch (err) {
    console.warn(`  ⚠️ pHash generation failed for ${basename(filePath)}:`, err);
    auditRecordError('phash_generation', (err as Error).message);
    return '';
  }
}

/**
 * Generates pHash for a specific page of a PDF using sharp.
 */
export async function generatePagePhash(
  filePath: string,
  pageIndex: number,
  auditRecordError: (type: string, message: string) => void,
): Promise<string> {
  try {
    const { data } = await sharp(filePath, { page: pageIndex })
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const avg = data.reduce((sum, val) => sum + val, 0) / 64;
    let hash = '';
    for (let i = 0; i < 64; i++) {
      hash += data[i] >= avg ? '1' : '0';
    }
    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      hex += parseInt(hash.substring(i, i + 4), 2).toString(16);
    }
    return hex;
  } catch (_err) {
    auditRecordError('page_phash_generation', (_err as Error).message);
    return '';
  }
}

/**
 * Run the Python unredact pipeline on a PDF and return the path to the
 * unredacted PDF if successful, otherwise fall back to the original.
 *
 * This is intentionally conservative: failures will not break ingestion,
 * they just skip unredaction.
 */
export async function maybeUnredactPdf(originalPath: string): Promise<UnredactionResult> {
  // Only run on obvious PDF paths
  if (!originalPath.toLowerCase().endsWith('.pdf')) return { pdfPath: originalPath };

  return await new Promise((resolve) => {
    try {
      const tmpDir = mkdtempSync(join(tmpdir(), 'unredact-'));
      const scriptPath = join(process.cwd(), 'scripts', 'unredact.py');
      const managedPython = join(process.cwd(), '.venv', 'bin', 'python');
      const pythonBin =
        process.env.PIPELINE_PYTHON || (existsSync(managedPython) ? managedPython : 'python3');

      const absoluteOriginalPath = isAbsolute(originalPath)
        ? originalPath
        : resolvePath(process.cwd(), originalPath);
      const args = [
        scriptPath,
        '-i',
        absoluteOriginalPath,
        '-o',
        tmpDir,
        '-b',
        '1',
        '--highlight',
        '0',
      ];

      const child = execFile(pythonBin, args, { cwd: tmpDir }, (err) => {
        if (err) {
          console.warn('  ⚠️  unredact.py failed, using original PDF:', err.message);
          // Cleanup on error
          try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
          } catch (e) {
            console.warn('  ⚠️  Cleanup failed for unredact.py temp dir:', e);
          }
          return resolve({ pdfPath: originalPath });
        }

        // Infer name: original.pdf -> original_UNREDACTED.pdf
        const base = basename(originalPath, '.pdf');
        const candidatePdf = join(
          process.cwd(),
          'data/temp_extraction',
          `${base}_${Date.now()}.pdf`,
        );
        const resultPdf = join(tmpDir, `${base}_UNREDACTED.pdf`);
        const candidateJson = join(tmpDir, `${base}_UNREDACTED.json`);

        if (existsSync(resultPdf)) {
          let unredactedSpans: OverlayTextFinding[] = [];

          // Copy the result PDF out of tmp before we delete tmp
          if (!existsSync(join(process.cwd(), 'data/temp_extraction'))) {
            mkdirSync(join(process.cwd(), 'data/temp_extraction'), { recursive: true });
          }
          copyFileSync(resultPdf, candidatePdf);

          if (existsSync(candidateJson)) {
            try {
              const raw = readFileSync(candidateJson, 'utf-8');
              const data = JSON.parse(raw);
              if (data && Array.isArray(data.spans)) {
                unredactedSpans = data.spans.filter((span: unknown): span is OverlayTextFinding =>
                  Boolean(
                    span &&
                    typeof span === 'object' &&
                    (span as { kind?: unknown }).kind === 'overlay_text_exposed' &&
                    typeof (span as { text?: unknown }).text === 'string',
                  ),
                );
                console.log(`   ✨ Captured ${unredactedSpans.length} unredacted text spans.`);
              }
            } catch (e) {
              console.warn('   ⚠️ Failed to parse unredaction JSON:', e);
            }
          }

          // Cleanup tmp dir
          try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
          } catch (e) {
            console.warn('  ⚠️  Failed to log unredaction stats:', e);
          }

          console.log(`   🧰 Using evidence-preserving forensic PDF copy: ${candidatePdf}`);
          return resolve({ pdfPath: candidatePdf, unredactedSpans });
        }

        // Fallback to original if we cannot locate output
        console.warn('  ⚠️  unredact.py completed but output not found, using original PDF');
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch (e) {
          console.warn('  ⚠️  Failed to handle unredaction cleanup:', e);
        }
        resolve({ pdfPath: originalPath });
      });

      // If the process errors before callback
      child.on('error', (err) => {
        console.warn('  ⚠️  Failed to spawn unredact.py, using original PDF:', err.message);
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch (e) {
          console.warn('  ⚠️  Failed to finalize unredaction results:', e);
        }
        resolve({ pdfPath: originalPath });
      });
    } catch (e) {
      console.warn(
        '  ⚠️  Exception running unredact.py, using original PDF:',
        (e as Error).message,
      );
      resolve({ pdfPath: originalPath });
    }
  });
}

export async function storeRedactions(
  documentId: number,
  content: string,
  unredactedSpans: OverlayTextFinding[] | null,
  ctx: IngestContext,
) {
  try {
    const hashResult = await ctx.db.query<{ content_hash: string | null }>(
      'SELECT content_hash FROM documents WHERE id = $1',
      [documentId],
    );
    const sourceSha256 = hashResult.rows[0]?.content_hash || null;
    await ctx.db.query(
      `DELETE FROM redaction_findings
       WHERE document_id = $1 AND method IN ('pdf_object_order_v2', 'context_classifier_v2')`,
      [documentId],
    );

    // 1. Process "Faulty" Redactions (Hidden Layer Text Recovered)
    if (unredactedSpans) {
      for (const span of unredactedSpans) {
        const cleanSpanText = TextCleaner.cleanOcrText(span.text || '').trim();
        if (!cleanSpanText) continue;

        const idx = content.indexOf(cleanSpanText);
        const pre = idx < 0 ? '' : content.substring(Math.max(0, idx - 100), idx);
        const post =
          idx < 0
            ? ''
            : content.substring(idx + cleanSpanText.length, idx + cleanSpanText.length + 100);

        let inference = RedactionClassifier.classify(pre, post);
        try {
          const aiInferences = await AIEnrichmentService.classifyRedaction(pre, post);
          if (aiInferences && aiInferences.length > 0) {
            const top = aiInferences[0];
            const map: Record<string, RedactionInference['inferredClass']> = {
              PERSON: 'person',
              ORGANIZATION: 'org',
              LOCATION: 'location',
              DATE: 'date',
              FINANCIAL: 'misc',
              LEGAL: 'misc',
              OTHER: 'misc',
            };
            const mapped = map[top.type?.toUpperCase()] || 'misc';
            inference = {
              inferredClass: mapped,
              inferredRole: mapped === 'misc' ? top.type?.toLowerCase() || null : null,
              confidence: top.confidence || 0.6,
              evidence: [top.description || 'ai_inferred'],
            };
          }
        } catch (_e) {
          ctx.audit.recordError('overlay_inference', (_e as Error).message);
        }

        await ctx.db.query(
          `INSERT INTO redaction_findings (
               document_id, page_number, span_start, span_end, finding_type, source_text, bbox_json,
               inferred_class, confidence, evidence_json, method, source_sha256
             ) VALUES ($1, $2, $3, $4, 'overlay_text_exposed', $5, $6, $7, $8, $9, $10, $11)`,
          [
            documentId,
            span.page,
            idx < 0 ? null : idx,
            idx < 0 ? null : idx + cleanSpanText.length,
            cleanSpanText,
            JSON.stringify({ text: span.bbox, overlay: span.redaction_bbox || null }),
            inference.inferredClass,
            Math.max(Number(span.confidence) || 0, inference.confidence),
            JSON.stringify([...span.evidence, ...inference.evidence]),
            span.method,
            sourceSha256,
          ],
        );
      }
    }

    // 2. Process "True" Redactions (Text Patterns)
    const redactedPattern = /\[(REDACTED|Media Redacted|Excerpt Redacted|Redacted|redacted)\]/g;
    let match;
    let count = 0;
    while ((match = redactedPattern.exec(content)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      const pre = content.substring(Math.max(0, start - 100), start);
      const post = content.substring(end, end + 100);

      const inference = RedactionClassifier.classify(pre, post);

      await ctx.db.query(
        `INSERT INTO redaction_findings (
           document_id, span_start, span_end, finding_type, source_text, inferred_class, confidence,
           evidence_json, method, source_sha256
         ) VALUES ($1, $2, $3, 'unresolved_redaction', $4, $5, $6, $7, 'context_classifier_v2', $8)`,
        [
          documentId,
          start,
          end,
          match[0],
          inference.inferredClass,
          inference.confidence,
          JSON.stringify(inference.evidence),
          sourceSha256,
        ],
      );
      count++;
    }

    if (count > 0) {
      await ctx.db.query(
        'UPDATE documents SET has_redactions = true, redaction_count = $1 WHERE id = $2',
        [count, documentId],
      );
      console.log(`\n      Stored ${count} redactions for doc ${documentId}`);
    }
    await ctx.db.query(
      `INSERT INTO redaction_document_scans (
         document_id, source_sha256, overlay_scanned_at, context_scanned_at, scanner_version
       ) VALUES ($1, $2, NOW(), NOW(), 'redaction-intelligence-v1')
       ON CONFLICT (document_id) DO UPDATE SET
         source_sha256 = EXCLUDED.source_sha256,
         overlay_scanned_at = EXCLUDED.overlay_scanned_at,
         context_scanned_at = EXCLUDED.context_scanned_at,
         scanner_version = EXCLUDED.scanner_version,
         error_text = NULL,
         updated_at = NOW()`,
      [documentId, sourceSha256],
    );
  } catch (e) {
    console.warn('   Failed to store redactions:', e);
  }
}
