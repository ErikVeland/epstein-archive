// ============================================================================
// DOCUMENT PROCESSOR — main per-file orchestrator (~830 lines)
// ============================================================================

import { basename, extname } from 'path';
import * as path from 'path';
import { readFileSync, statSync } from 'fs';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { PipelineService } from '../../src/server/services/pipelineService.js';
import { AssetService } from '../../src/server/services/assetService.js';
import {
  computeSha256Hex,
  documentProvenanceService,
  inferSourceSystem,
} from '../../src/server/services/documentProvenanceService.js';
import { AIEnrichmentService } from '../../src/server/services/AIEnrichmentService.js';
import { TextCleaner } from '../utils/text_cleaner.js';
import { detectMimeType } from './mime.js';
import {
  extractTextFromPdf,
  extractTextFromImage,
  stripRtf,
  ocrFallbackForPdf,
  transcribeMedia,
  processArchive,
  processEmail,
} from './extraction.js';
import {
  deriveMediaTitle,
  generatePhash,
  maybeUnredactPdf,
  storeRedactions,
} from './provenance.js';
import { syncMediaItemFromDocument } from './media.js';
import { storeGranularData, applyWatermark } from './ai_artifacts.js';
import type { CollectionConfig } from './types.js';
import type { IngestContext } from './context.js';
import { PIPELINE_VERSION, OCR_FALLBACK_WORD_THRESHOLD, MEDIA_TEXT_THRESHOLD } from './config.js';

/**
 * Check for pause/stop signals from the database
 */
async function checkControlSignal(ctx: IngestContext): Promise<void> {
  if (!ctx.currentRun) return; // Not in a run context

  const { status, control_signal } = await PipelineService.getRunStatus(ctx.currentRun.id);

  if (control_signal === 'stop') {
    console.log('\n🛑 STOP signal received from dashboard. Exiting cleanly...');
    await PipelineService.updateRunStatus(
      ctx.currentRun.id,
      'cancelled',
      'Stopped by user via dashboard',
    );
    process.exit(0);
  }

  if (control_signal === 'pause' || status === 'paused') {
    if (status !== 'paused') {
      await PipelineService.updateRunStatus(ctx.currentRun.id, 'paused');
    }
    console.log(
      '\n⏳ PAUSE signal active (Run ID: ' + ctx.currentRun.id + '). Waiting for resume...',
    );

    // Poll every 5 seconds until the status is no longer paused
    let waiting = true;
    while (waiting) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const poll = await PipelineService.getRunStatus(ctx.currentRun.id);
      if (poll.control_signal === 'stop') {
        console.log('\n🛑 STOP signal received during pause. Exiting...');
        await PipelineService.updateRunStatus(
          ctx.currentRun.id,
          'cancelled',
          'Stopped by user via dashboard',
        );
        process.exit(0);
      }
      if (poll.control_signal === 'resume' || poll.status === 'running') {
        process.stdout.write('▶️ RESUME signal received. Continuing...\n');
        await PipelineService.updateRunStatus(ctx.currentRun.id, 'running');
        await PipelineService.setControlSignal(ctx.currentRun.id, null);
        waiting = false;
      }
    }
  }
}

async function estimateTextCoverage(text: string, pageCount: number): Promise<number> {
  if (!text || pageCount <= 0) return 0;
  // Very rough heuristic: words per page, capped to avoid extreme outliers
  const words = (text.match(/\b[\w']+\b/g) || []).length;
  const wordsPerPage = words / pageCount;
  const normalized = Math.min(wordsPerPage / 350, 1); // assume ~350 words/page is "full"
  return normalized;
}

function buildBaselineVocab(text: string): string {
  if (!text) return '';
  const tokens = text.match(/\b[\w']+\b/g) || [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawToken of tokens) {
    const token = rawToken.toLowerCase();
    // Skip very short/long tokens and obvious noise
    if (token.length < 4 || token.length > 40) continue;
    if (/^[0-9]+$/.test(token)) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    result.push(token);
    // Hard cap to avoid pathological documents blowing up the row size
    if (result.length >= 5000) break;
  }

  return result.join(' ');
}

export async function processDocument(
  filePath: string,
  collection: CollectionConfig,
  ctx: IngestContext,
  metaOverride?: any,
): Promise<{ success: boolean; error?: string; documentId?: number }> {
  let documentId: number | undefined;
  let existingDoc: any;

  try {
    const sourceUrl =
      metaOverride?.source_url ||
      metaOverride?.source_original_url ||
      metaOverride?.sourceUrl ||
      null;
    const sourceAcquisitionMethod = metaOverride?.parent_document_id
      ? 'derived_from_parent_document'
      : sourceUrl
        ? 'imported_source_url'
        : 'filesystem_ingest';
    const sourceSystem = inferSourceSystem({
      sourceCollection: collection.name,
      sourcePath: filePath,
      sourceUrl,
    });

    // Fast-Skip: Check by path first to avoid rehashing files already in the database
    const encodedPath = filePath
      .split('/')
      .map((p) => encodeURIComponent(p))
      .join('/');
    const spaceEncodedPath = filePath.replace(/ /g, '%20');

    const pathCheck =
      (
        await ctx.db.query(
          `SELECT id, content_sha256, processing_status,
                  (content IS NOT NULL AND length(content) > 50) AS has_content
           FROM documents
           WHERE (file_path = $1 OR file_path = $2 OR file_path = $3)`,
          [filePath, encodedPath, spaceEncodedPath],
        )
      ).rows[0] ?? null;

    let sha256: string = '';

    if (pathCheck && pathCheck.content_sha256 && !ctx.shouldRehash) {
      // Use existing hash and skip expensive readFileSync/sha256
      sha256 = pathCheck.content_sha256;
      existingDoc = pathCheck;

      if (
        (pathCheck.processing_status === 'succeeded' ||
          pathCheck.processing_status === 'completed') &&
        pathCheck.has_content
      ) {
        console.log(`   ⏭️  Fast-Skipping (${pathCheck.processing_status}): ${basename(filePath)}`);
        return { success: true, documentId: pathCheck.id };
      }

      console.log(`   ♻️  Resuming (existing hash): ${basename(filePath)}`);
    } else {
      // Hard path: Read and hash the file (Forced rehash or path not in DB)
      const buffer = readFileSync(filePath);
      sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

      // Check by SHA-256 for deduplication
      existingDoc =
        (
          await ctx.db.query(
            `SELECT id, processing_status,
                    (content IS NOT NULL AND length(content) > 50) AS has_content,
                    content_sha256
             FROM documents WHERE content_sha256 = $1`,
            [sha256],
          )
        ).rows[0] ?? null;

      // If we are rehashing and the hash changed, we treat it as a new document version or an updated file
      if (ctx.shouldRehash && pathCheck && pathCheck.content_sha256 !== sha256) {
        console.log(`   🚨 File signature changed for: ${basename(filePath)} (Updating hash)`);
        // We'll let the rest of the logic handle it - it will either find the NEW hash in existingDoc
        // Or if it's a completely new hash, it will create/update the document entry.
      }
    }

    if (!existingDoc) {
      // Create skeleton document atomically
      try {
        const result =
          (
            await ctx.db.query(
              `
          INSERT INTO documents (
            file_name, file_path, source_collection, content_sha256,
            processing_status, pipeline_version, ingestion_run_id, hash_algo,
            parent_document_id, source_path, source_url, source_system,
            source_release, source_acquisition_method
          ) VALUES ($1, $2, $3, $4, 'queued', $5, $6, 'sha256', $7, $8, $9, $10, $11, $12)
          RETURNING id, processing_status
        `,
              [
                basename(filePath),
                filePath,
                collection.name,
                sha256,
                PIPELINE_VERSION,
                ctx.currentRun?.id,
                metaOverride?.parent_document_id || null,
                filePath,
                sourceUrl,
                sourceSystem,
                collection.name,
                sourceAcquisitionMethod,
              ],
            )
          ).rows[0] ?? null;
        existingDoc = result;
      } catch (_e) {
        ctx.audit.recordError('doc_lookup_fallback', (_e as Error).message);
        existingDoc =
          (
            await ctx.db.query(
              `SELECT id, processing_status,
                      (content IS NOT NULL AND length(content) > 50) AS has_content
               FROM documents WHERE content_sha256 = $1 OR file_path = $2`,
              [sha256, filePath],
            )
          ).rows[0] ?? null;

        if (!existingDoc) {
          throw new Error(
            `Critical: Failed to resolve document after insert failure for ${filePath}`,
          );
        }
      }
    }

    if (
      !ctx.shouldRehash &&
      (existingDoc.processing_status === 'succeeded' ||
        existingDoc.processing_status === 'completed') &&
      existingDoc.has_content
    ) {
      console.log(`   ⏭️  Skipping (${existingDoc.processing_status}): ${basename(filePath)}`);
      return { success: true, documentId: existingDoc.id };
    }

    // Ensure job exists and try to lease it
    const job =
      (
        await ctx.db.query(
          "SELECT id FROM processing_jobs WHERE target_type = 'document' AND target_id = $1 AND step_name = 'ingestion'",
          [(existingDoc as any).id],
        )
      ).rows[0] ?? null;
    if (!job) {
      await ctx.db.query(
        'INSERT INTO processing_jobs (run_id, step_name, target_type, target_id, max_attempts) VALUES ($1, $2, $3, $4, $5)',
        [ctx.currentRun?.id, 'ingestion', 'document', (existingDoc as any).id, 5],
      );
    }

    // Attempt to lease specifically for this document
    const leaseResult = await ctx.db.query(
      `UPDATE processing_jobs
       SET status = 'running', locked_by = $1, locked_at = CURRENT_TIMESTAMP, attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP
       WHERE target_type = 'document' AND target_id = $2 AND step_name = 'ingestion'
         AND (status = 'queued' OR (status = 'running' AND locked_at < NOW() - INTERVAL '10 minutes'))`,
      [ctx.currentRun?.run_uuid, (existingDoc as any).id],
    );

    if (leaseResult.rowCount === 0) {
      console.log(`   ⏳ Could not lease job for ${basename(filePath)} (locked by another worker)`);
      return { success: true };
    }

    // We need the job object for later code that expects 'leasedJob.id'
    const leasedJob =
      (
        await ctx.db.query(
          "SELECT id FROM processing_jobs WHERE target_type = 'document' AND target_id = $1 AND step_name = 'ingestion'",
          [(existingDoc as any).id],
        )
      ).rows[0] ?? null;

    // If we are here, we own the lease for (existingDoc as any).id
    documentId = (existingDoc as any).id;
    console.log(`   ⚙️  Processing document ${documentId}: ${basename(filePath)}`);

    // fallback check by path (legacy)
    const existingPath =
      (await ctx.db.query('SELECT id FROM documents WHERE file_path = $1', [filePath])).rows[0] ??
      null;
    if (existingPath) {
      console.log(`   Updating legacy path entry with SHA-256: ${basename(filePath)}`);
      await ctx.db.query('UPDATE documents SET content_sha256 = $1 WHERE id = $2', [
        sha256,
        (existingPath as any).id,
      ]);
      documentId = (existingPath as any).id;
    }

    // Register Asset
    await checkControlSignal(ctx);
    const mimeType = await detectMimeType(filePath);
    const stats = statSync(filePath);
    const ext = extname(filePath).toLowerCase();
    // stats read for mime-type and size below

    let content = '';
    let pageCount = 0;
    let unredactionAttempted = 0;
    let unredactionSucceeded = 0;
    let redactionCoverageBefore: number | null = null;
    let redactionCoverageAfter: number | null = null;
    let unredactedTextGain: number | null = null;
    let unredactionBaselineVocab: string | null = null;
    let evidenceType: string | null = null;
    let unredactedSpanJson: string | null = null;
    let unredactedSpans: any[] | null = null;
    let granularPages: any[] = [];
    const meta: any = metaOverride || {};
    let pdfPathForOcr: string | null = null;

    // Quarantine check (Requirement J)
    if (basename(filePath).toLowerCase().includes('quarantine')) {
      console.log(`   ⚠️  Document identified for Quarantine: ${basename(filePath)}`);
      evidenceType = 'quarantined';
    }

    // Mapping mime types to internal types/extensions for legacy compatibility
    let fileType = ext.replace('.', '').toUpperCase();
    if (mimeType === 'application/pdf') fileType = 'PDF';
    else if (mimeType.startsWith('image/')) fileType = mimeType.split('/')[1].toUpperCase();
    else if (mimeType === 'message/rfc822') fileType = 'EML';
    else if (mimeType === 'text/plain') fileType = 'TXT';
    else if (mimeType === 'text/html') fileType = 'HTML';
    else if (mimeType === 'application/rtf' || ext === '.rtf') fileType = 'RTF';
    else if (mimeType.startsWith('video/')) fileType = 'VIDEO';
    else if (mimeType.startsWith('audio/')) fileType = 'AUDIO';

    let phash: string | null = null;
    if (mimeType.startsWith('image/')) {
      phash = await generatePhash(filePath, ctx.audit.recordError.bind(ctx.audit));
    }

    const assetId = await AssetService.registerAsset({
      storagePath: filePath,
      sha256,
      mimeType,
      fileSize: stats.size,
      sourceCollection: collection.name,
      isOriginal: true,
      phash: phash || undefined,
    });

    if (documentId) {
      await documentProvenanceService.upsertEvent(
        {
          documentId,
          runId: ctx.currentRun?.id,
          eventType: 'ingest_discovered',
          actorType: 'system',
          toolName: 'ingest_pipeline',
          toolVersion: PIPELINE_VERSION,
          sourceCollection: collection.name,
          sourcePath: filePath,
          sourceUrl,
          fileSha256: sha256,
          metadata: {
            fileName: basename(filePath),
            sourceSystem,
            sourceAcquisitionMethod,
          },
        },
        ctx.db,
      );

      await documentProvenanceService.upsertEvent(
        {
          documentId,
          runId: ctx.currentRun?.id,
          eventType: 'asset_registered',
          eventOrder: 1,
          actorType: 'system',
          toolName: 'ingest_pipeline',
          toolVersion: PIPELINE_VERSION,
          outputAssetId: assetId,
          sourceCollection: collection.name,
          sourcePath: filePath,
          sourceUrl,
          fileSha256: sha256,
          metadata: {
            mimeType,
            fileSize: stats.size,
            phash,
            isOriginal: true,
          },
        },
        ctx.db,
      );
    }

    // Apply watermark if needed (Creates a derivative asset)
    const derivative = await applyWatermark(filePath, collection.name, assetId, ctx);
    if (documentId && derivative) {
      await documentProvenanceService.upsertEvent(
        {
          documentId,
          runId: ctx.currentRun?.id,
          eventType: 'derivative_generated',
          eventOrder: 2,
          actorType: 'system',
          toolName: 'ingest_pipeline',
          toolVersion: PIPELINE_VERSION,
          inputAssetId: assetId,
          outputAssetId: (derivative as any).assetId,
          sourceCollection: collection.name,
          sourcePath: filePath,
          sourceUrl,
          fileSha256: (derivative as any).sha256 || null,
          metadata: {
            derivativeKind: 'watermarked',
            derivativePath: (derivative as any).derivativePath || null,
          },
        },
        ctx.db,
      );
    }

    // buffer already read above for sha256
    // Use SHA-256 as the primary hash now

    // Initial metadata object
    let metadataObj: any = {
      originalFilename: basename(filePath),
      size: stats.size,
      mtime: stats.mtime,
      collection: collection.name,
    };

    // Merge if we have extra metadata (e.g. from email parsing)
    if (meta.metadata_json) {
      try {
        const parsed = JSON.parse(meta.metadata_json);
        metadataObj = { ...metadataObj, ...parsed };
      } catch (_e) {
        ctx.audit.recordError('metadata_json_parse', (_e as Error).message);
      }
    }

    // Extract text based on content-type
    if (mimeType === 'application/pdf') {
      // First, extract from the original PDF so we can estimate baseline coverage.
      const originalBuffer = readFileSync(filePath);
      const originalResult = await extractTextFromPdf(originalBuffer);
      const originalText = (originalResult.text || '').trim();
      const originalPages = originalResult.pageCount || 0;
      const baselineCoverage = await estimateTextCoverage(originalText, originalPages || 1);
      unredactionBaselineVocab = buildBaselineVocab(originalText);

      // Try to unredact the PDF before extracting any text so we capture
      // redacted-under graphics/text where possible.
      unredactionAttempted = 1;
      const unredactResult = await maybeUnredactPdf(filePath);
      pdfPathForOcr = unredactResult.pdfPath;
      const unredactedSpansData = unredactResult.unredactedSpans;

      if (unredactedSpansData && unredactedSpansData.length > 0) {
        unredactedSpans = unredactedSpansData;
        unredactedSpanJson = JSON.stringify(unredactedSpans);
      }

      const pdfBuffer = readFileSync(pdfPathForOcr);
      const result = await extractTextFromPdf(pdfBuffer);
      const unredactedText = (result.text || '').trim();

      // ── OCR fallback for scanned PDFs ─────────────────────────────────────
      // If pdf-parse returned fewer than threshold real words the PDF has no
      // embedded text layer — it's a scan.  Render each page via sharp and
      // run Tesseract on the image instead.
      const extractedWords = unredactedText.match(/\b[a-zA-Z]{3,}\b/g)?.length ?? 0;
      let pdfTextForCleaning = unredactedText;

      if (extractedWords < OCR_FALLBACK_WORD_THRESHOLD && result.pageCount > 0) {
        console.log(
          `   🔍 Sparse PDF text (${extractedWords} words) — running Tesseract OCR on ${result.pageCount} page(s)...`,
        );
        const ocrResult = await ocrFallbackForPdf(pdfPathForOcr, result.pageCount);
        const ocrWords = ocrResult.text.match(/\b[a-zA-Z]{3,}\b/g)?.length ?? 0;

        if (ocrWords > extractedWords) {
          console.log(`   ✅ OCR yielded ${ocrWords} words (vs ${extractedWords} from text layer)`);
          pdfTextForCleaning = ocrResult.text;
          granularPages = ocrResult.pages; // override with per-page OCR results
          if (ocrResult.vlm_parsed) {
            metadataObj.vlm_parsed = true;
          }
        } else {
          console.log(
            `   ⚠️  OCR (${ocrWords} words) did not improve on text layer — keeping original`,
          );
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      // AI Forensic Repair Integration
      content = await TextCleaner.cleanOcrTextAsync(
        pdfTextForCleaning,
        metadataObj.subject || basename(filePath),
      );

      if (!granularPages.length) granularPages = result.pages;
      pageCount = result.pageCount;

      const afterCoverage = await estimateTextCoverage(unredactedText, pageCount || 1);
      redactionCoverageBefore = 1 - baselineCoverage;
      redactionCoverageAfter = 1 - afterCoverage;
      unredactedTextGain = afterCoverage - baselineCoverage;

      if (unredactedSpans && unredactedSpans.length > 0) {
        unredactionSucceeded = 1;
      }

      // Fallback: if we didn't unredact or used original, make sure granularPages has something
      if (granularPages.length === 0 && originalResult.pages.length > 0) {
        granularPages = originalResult.pages;
      }
    } else if (mimeType === 'application/rtf' || ext === '.rtf') {
      const raw = readFileSync(filePath, 'utf-8');
      content = stripRtf(raw);
      pageCount = 1;
      evidenceType = evidenceType ?? 'document';
    } else if (mimeType === 'text/plain') {
      content = readFileSync(filePath, 'utf-8');
      pageCount = 1;
    } else if (mimeType.startsWith('image/')) {
      const result = await extractTextFromImage(filePath);
      if (result.vlm_parsed) metadataObj.vlm_parsed = true;

      // AI Forensic Repair Integration
      content = await TextCleaner.cleanOcrTextAsync(
        result.text,
        metadataObj.subject || basename(filePath),
      );

      pageCount = result.pageCount;
    } else if (mimeType === 'application/zip' || ext === '.zip') {
      const archResult = await processArchive(filePath);
      if (archResult.isEncrypted) {
        console.warn(`   🛑 Archive is password protected (Quarantined): ${basename(filePath)}`);
        evidenceType = 'quarantined';
        content = '[ENCRYPTED ARCHIVE - QUARANTINED]';
      } else {
        evidenceType = 'archive';
        content = `[ARCHIVE: ${archResult.members.length} members extracted]`;
        (meta as any)._archiveMembers = archResult.members;
        (meta as any)._archiveSha256 = sha256;
      }
    } else if (
      mimeType === 'message/rfc822' ||
      mimeType === 'text/html' ||
      ext === '.msg' ||
      ext === '.meta'
    ) {
      const result = await processEmail(filePath, ctx.audit.recordError.bind(ctx.audit));
      content = result.content;
      meta.metadata_json = JSON.stringify(result.metadata);
      if (result.date) {
        meta.date_created = result.date;
      }
      // Store attachments for later processing
      if (result.attachments && result.attachments.length > 0) {
        (meta as any)._attachments = result.attachments;
      }
      // Store email SHA256 for attachment directory organization
      if (result.emailSha256) {
        (meta as any)._emailSha256 = result.emailSha256;
      }
      evidenceType = 'email'; // Explicitly set type
    } else if (
      mimeType.startsWith('video/') ||
      mimeType.startsWith('audio/') ||
      ['.mp4', '.mov', '.avi', '.mkv', '.m4v', '.wav', '.mp3', '.m4a', '.aac', '.flac'].includes(
        ext,
      )
    ) {
      const mediaType = mimeType.startsWith('audio/') ? 'audio' : 'video';
      console.log(`   🎬 Transcribing ${mediaType}: ${basename(filePath)}`);
      const result = await transcribeMedia(filePath);

      if (result.text.length > 20) {
        content = result.text;
      } else {
        content = `[${ext.toUpperCase()} FILE — transcription produced no output]`;
      }

      pageCount = 1;
      evidenceType = mediaType;
      if (result.durationSeconds > 0) {
        (meta as any).durationSeconds = result.durationSeconds;
        (meta as any).durationFormatted = new Date(result.durationSeconds * 1000)
          .toISOString()
          .substr(11, 8); // HH:MM:SS
      }
      (meta as any).transcribedBy = `whisper-${process.env.WHISPER_MODEL || 'base'}`;
    } else {
      // For other file types, mark as unprocessed
      content = `[${ext.toUpperCase()} FILE - OCR NOT YET PROCESSED]`;
      pageCount = 1;
    }

    // Calculate metadata
    const contentPreview = content.substring(0, 500);
    // AI summary (forensic-focused)
    let aiSummary: string | null = null;
    try {
      aiSummary = await AIEnrichmentService.summarizeDocument(content, {
        fileName: metadataObj.subject || basename(filePath),
        subject: metadataObj.subject,
      });
    } catch (_e) {
      ctx.audit.recordError('ai_enrichment', (_e as Error).message);
      aiSummary = null;
    }
    if (aiSummary && documentId) {
      try {
        const inputHash = crypto.createHash('sha256').update(content).digest('hex');
        const outputHash = crypto
          .createHash('sha256')
          .update(content + aiSummary)
          .digest('hex');
        await PipelineService.upsertAiArtifact({
          runId: ctx.currentRun?.id,
          documentId: Number(documentId),
          artifactType: 'summary',
          artifactVersion: 'summary-v2',
          modelId: process.env.EXO_MODEL || process.env.AI_PROVIDER || 'auto',
          promptVersion: 'forensic-summary-v1',
          sourceExcerpt: content.slice(0, 2000),
          outputText: aiSummary,
          confidence: 0.75,
          provenance: {
            provider: process.env.AI_PROVIDER,
            pipelineVersion: PIPELINE_VERSION,
            inputHash,
            outputHash,
            canonicalTextUpdated: false,
          },
        });
      } catch (_e) {
        ctx.audit.recordError('ai_artifact_persist', (_e as Error).message);
      }
    }
    const wordCount = content ? (content.match(/\b[\w']+\b/g) || []).length : 0;
    const normalizedTextSha256 = content ? computeSha256Hex(content) : null;
    metadataObj.provenance = {
      file_sha256: sha256,
      normalized_text_sha256: normalizedTextSha256,
      ingestion_run_id: ctx.currentRun?.id,
      pipeline_version: PIPELINE_VERSION,
      source_collection: collection.name,
      source_path: filePath,
      source_url: sourceUrl,
      source_system: sourceSystem,
      source_acquisition_method: sourceAcquisitionMethod,
      parent_document_id: metaOverride?.parent_document_id || null,
    };
    // fileType already calculated above

    // Update the skeleton document with extracted content
    await ctx.db.query(
      `
            UPDATE documents SET
                content = $1,
                content_hash = $2,
                page_count = $3,
                metadata_json = $4,
                red_flag_rating = $5,
                content_preview = $6,
                file_type = $7,
                file_size = $8,
                word_count = $9,
                processing_status = 'succeeded',
                unredaction_attempted = $10,
                unredaction_succeeded = $11,
                redaction_coverage_before = $12,
                redaction_coverage_after = $13,
                unredacted_text_gain = $14,
                unredaction_baseline_vocab = $15,
                evidence_type = $16,
                unredacted_span_json = $17,
                normalized_text_sha256 = $18,
                analyzed_at = NOW(),
                created_at = NOW()
            WHERE id = $19
        `,
      [
        content,
        sha256,
        pageCount,
        JSON.stringify(metadataObj),
        0,
        contentPreview,
        fileType,
        stats.size,
        wordCount,
        unredactionAttempted,
        unredactionSucceeded,
        redactionCoverageBefore,
        redactionCoverageAfter,
        unredactedTextGain,
        unredactionBaselineVocab,
        evidenceType,
        unredactedSpanJson,
        normalizedTextSha256,
        documentId,
      ],
    );

    if (documentId) {
      await documentProvenanceService.upsertEvent(
        {
          documentId,
          runId: ctx.currentRun?.id,
          eventType: 'content_extracted',
          eventOrder: 3,
          actorType: 'system',
          toolName: 'ingest_pipeline',
          toolVersion: PIPELINE_VERSION,
          outputAssetId: assetId,
          sourceCollection: collection.name,
          sourcePath: filePath,
          sourceUrl,
          fileSha256: sha256,
          textSha256: normalizedTextSha256,
          metadata: {
            evidenceType,
            fileType,
            mimeType,
            pageCount,
            wordCount,
            unredactionAttempted,
            unredactionSucceeded,
            ocrFallbackUsed:
              mimeType === 'application/pdf' && pageCount > 0
                ? redactionCoverageBefore !== null || redactionCoverageAfter !== null
                : false,
          },
        },
        ctx.db,
      );

      if (metaOverride?.parent_document_id) {
        await documentProvenanceService.upsertEvent(
          {
            documentId,
            runId: ctx.currentRun?.id,
            eventType: 'derived_from_parent_document',
            eventOrder: 4,
            actorType: 'system',
            toolName: 'ingest_pipeline',
            toolVersion: PIPELINE_VERSION,
            inputDocumentId: metaOverride.parent_document_id,
            parentDocumentId: metaOverride.parent_document_id,
            sourceCollection: collection.name,
            sourcePath: filePath,
            sourceUrl,
            fileSha256: sha256,
            textSha256: normalizedTextSha256,
            metadata: {
              sourceAcquisitionMethod,
            },
          },
          ctx.db,
        );
      }

      await documentProvenanceService.refreshDocumentSummary(
        documentId,
        {
          normalizedTextSha256,
          sourceCollection: collection.name,
          sourcePath: filePath,
          sourceUrl,
          sourceSystem,
          sourceRelease: collection.name,
          sourceAcquisitionMethod,
        },
        ctx.db,
      );
    }

    // Phase 9: Sync Job Completion
    if (leasedJob) {
      await ctx.db.query(
        'UPDATE processing_jobs SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['succeeded', leasedJob.id],
      );
    }

    // Cleanup temp OCR PDF if it was created
    if (
      pdfPathForOcr &&
      pdfPathForOcr !== filePath &&
      pdfPathForOcr.includes('data/temp_extraction')
    ) {
      try {
        fs.unlinkSync(pdfPathForOcr);
      } catch (e) {
        console.warn('  ⚠️  Ignored error during batch cleanup:', e);
      }
    }

    // Handle attachments if this was an email (Phase 2 Hardening)
    const attachments = (meta as any)._attachments;
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      const emailSha256 = (meta as any)._emailSha256;
      const attachmentBaseDir = path.join('data/attachments', emailSha256);
      if (!fs.existsSync(attachmentBaseDir)) {
        fs.mkdirSync(attachmentBaseDir, { recursive: true });
      }

      for (const att of attachments) {
        try {
          const attPath = path.join(attachmentBaseDir, att.filename);
          fs.writeFileSync(attPath, att.content);

          // Recursively process the attachment as a document
          await processDocument(attPath, collection, ctx, {
            parent_document_id: documentId,
            source_collection: collection.name,
          });
          console.log(`      🖇️ Attached: ${att.filename}`);
        } catch (attError) {
          console.error(`      ❌ Failed to process attachment ${att.filename}:`, attError);
        }
      }
    }

    // Handle Archive members (Phase 2 Hardening)
    const members = (meta as any)._archiveMembers;
    if (members && Array.isArray(members) && members.length > 0) {
      const archSha256 = (meta as any)._archiveSha256;
      const extractBaseDir = path.join('data/extracted', archSha256);
      if (!fs.existsSync(extractBaseDir)) {
        fs.mkdirSync(extractBaseDir, { recursive: true });
      }

      for (const member of members) {
        try {
          const memberPath = path.join(extractBaseDir, member.filename);
          fs.writeFileSync(memberPath, member.content);

          // Recursively process the member
          await processDocument(memberPath, collection, ctx, {
            parent_document_id: documentId,
            source_collection: collection.name,
          });
          console.log(`      📁 Extracted: ${member.filename}`);
        } catch (err) {
          console.error(`      ❌ Failed to extract member ${member.filename}:`, err);
        }
      }
    }

    if (documentId) {
      await AssetService.linkToDocument(documentId, assetId, 'primary');
      if (derivative) {
        await AssetService.linkToDocument(documentId, (derivative as any).assetId, 'watermarked');
      }
    }

    // Store Pages and Sentences (Phase 2 Hardening)
    if (documentId) {
      await storeGranularData(documentId, content, mimeType, ext, granularPages, filePath, ctx);
    }

    // Store Redactions (Phase 7)
    if (documentId) {
      await storeRedactions(documentId, content, unredactedSpans || null, ctx);
    }

    if (documentId) {
      const hasText = mimeType.startsWith('image/') && wordCount >= MEDIA_TEXT_THRESHOLD;
      const hasVisualAnalysis =
        mimeType.startsWith('image/') &&
        metadataObj.vlm_parsed === true &&
        content.trim().length > 0;
      const visualDescription = hasVisualAnalysis ? content.slice(0, 4000) : undefined;
      await syncMediaItemFromDocument(
        {
          documentId,
          filePath,
          mimeType,
          fileSize: stats.size,
          collectionName: collection.name,
          collectionDescription: collection.description,
          title: deriveMediaTitle(filePath, collection.name),
          description: visualDescription,
          metadata: {
            duration:
              typeof (meta as { durationSeconds?: unknown }).durationSeconds === 'number'
                ? (meta as { durationSeconds: number }).durationSeconds
                : undefined,
            durationFormatted:
              typeof (meta as { durationFormatted?: unknown }).durationFormatted === 'string'
                ? (meta as { durationFormatted: string }).durationFormatted
                : undefined,
            transcribedBy:
              typeof (meta as { transcribedBy?: unknown }).transcribedBy === 'string'
                ? (meta as { transcribedBy: string }).transcribedBy
                : undefined,
            ai_visual: hasVisualAnalysis
              ? {
                  indexed: true,
                  source: 'document_vlm',
                  description: visualDescription,
                  pipelineVersion:
                    typeof metadataObj.vlm_version === 'string'
                      ? metadataObj.vlm_version
                      : 'ingest-vlm',
                  reviewState: 'unreviewed',
                }
              : undefined,
          },
          dateTaken: meta.date_created || null,
          hasText,
        },
        ctx.db,
      );
    }

    return { success: true, documentId: documentId };
  } catch (error) {
    if (typeof documentId !== 'undefined') {
      const job =
        (
          await ctx.db.query(
            'SELECT id FROM processing_jobs WHERE target_type = $1 AND target_id = $2 AND step_name = $3 AND status = $4',
            ['document', documentId, 'ingestion', 'running'],
          )
        ).rows[0] ?? null;
      if (job) {
        const isRetryable =
          !(error as Error).message.includes('corrupt') &&
          !(error as Error).message.includes('encrypted');
        await ctx.db.query(
          'UPDATE processing_jobs SET status = $1, last_error = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [isRetryable ? 'failed_retryable' : 'failed_permanent', (error as Error).message, job.id],
        );
      }
    }
    return { success: false, error: (error as Error).message };
  }
}
