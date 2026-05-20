// ============================================================================
// PROVENANCE — pHash generation, unredaction, redaction storage
// ============================================================================

import { join, basename, extname } from 'path';
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
import type { UnredactionResult } from './types.js';

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

      // Use --highlight 1 to visibly mark unredacted text in the PDF
      const args = [scriptPath, '-i', originalPath, '-o', tmpDir, '-b', '1', '--highlight', '1'];

      const child = execFile('python3', args, { cwd: tmpDir }, (err) => {
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
          let unredactedSpans: any[] = [];

          // Copy the result PDF out of tmp before we delete tmp
          if (!existsSync(join(process.cwd(), 'data/temp_extraction'))) {
            mkdirSync(join(process.cwd(), 'data/temp_extraction'), { recursive: true });
          }
          copyFileSync(resultPdf, candidatePdf);

          if (existsSync(candidateJson)) {
            try {
              const raw = readFileSync(candidateJson, 'utf-8');
              const data = JSON.parse(raw);
              if (data && data.spans) {
                unredactedSpans = data.spans;
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

          console.log(`   🧰 Using unredacted PDF for OCR: ${candidatePdf}`);
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
  unredactedSpans: any[] | null,
  ctx: IngestContext,
) {
  try {
    const insertSpanSql = `
      INSERT INTO redaction_spans (
        document_id, span_start, span_end, bbox_json, redaction_kind,
        inferred_class, inferred_role, confidence, evidence_json, page_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    // 1. Process "Faulty" Redactions (Hidden Layer Text Recovered)
    if (unredactedSpans) {
      for (const span of unredactedSpans) {
        const cleanSpanText = TextCleaner.cleanOcrText(span.text || '').trim();
        if (!cleanSpanText) continue;

        const idx = content.indexOf(cleanSpanText);
        if (idx !== -1) {
          const pre = content.substring(Math.max(0, idx - 100), idx);
          const post = content.substring(
            idx + cleanSpanText.length,
            idx + cleanSpanText.length + 100,
          );

          let inference = RedactionClassifier.classify(pre, post);
          // If AI enrichment enabled, try semantic classification
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

          await ctx.db.query(insertSpanSql, [
            documentId,
            idx,
            idx + cleanSpanText.length,
            JSON.stringify(span.bbox || []),
            'pdf_overlay',
            inference.inferredClass,
            inference.inferredRole,
            inference.confidence,
            JSON.stringify(inference.evidence),
            null,
          ]);
        }
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

      await ctx.db.query(insertSpanSql, [
        documentId,
        start,
        end,
        null,
        'removed_text',
        inference.inferredClass,
        inference.inferredRole,
        inference.confidence,
        JSON.stringify(inference.evidence),
        null,
      ]);
      count++;
    }

    if (count > 0) {
      await ctx.db.query(
        'UPDATE documents SET has_redactions = true, redaction_count = $1 WHERE id = $2',
        [count, documentId],
      );
      console.log(`\n      Stored ${count} redactions for doc ${documentId}`);
    }
  } catch (e) {
    console.warn('   Failed to store redactions:', e);
  }
}
