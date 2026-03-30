#!/usr/bin/env tsx
/**
 * Unified Data Ingestion and Processing Pipeline
 *
 * Combines functionality from:
 * - ingest_unified.ts (PDF/image ingestion with OCR)
 * - enrich_external_data.ts (entity extraction and relationship mapping)
 * - extractEntities_v2.ts (entity normalization)
 *
 * Features:
 * - PDF text extraction with fallback OCR
 * - Multi-collection support
 * - Entity extraction and relationship mapping
 * - Progress tracking and error handling
 * - Production database schema compatibility
 */

import { join, basename, extname } from 'path';
import * as path from 'path';
import { statSync, readFileSync, existsSync, mkdtempSync, mkdirSync, copyFileSync } from 'fs';
import { opendir } from 'fs/promises';
import * as fs from 'fs';
import { tmpdir } from 'os';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// Fix for pdf-parse v2 import issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParseModule = require('pdf-parse');
const PDFParse = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse || pdfParseModule;
import * as crypto from 'crypto';
import { execFile } from 'child_process';
import sharp from 'sharp';

import { createWorker } from 'tesseract.js';
import { simpleParser } from 'mailparser';
import { convert } from 'html-to-text';
import AdmZip from 'adm-zip';
import { RedactionResolver } from '../src/server/services/RedactionResolver.js';
import { TextCleaner } from './utils/text_cleaner.js';
import { getIngestPool } from '../src/server/db/connection.js';
import { AIEnrichmentService } from '../src/server/services/AIEnrichmentService.js';
import { markViewsDirty } from '../src/server/services/matViewRefresh.js';
import {
  computeSha256Hex,
  documentProvenanceService,
  inferSourceSystem,
} from '../src/server/services/documentProvenanceService.js';

// ============================================================================
// CONFIGURATION & VERSIONING
// ============================================================================

const PIPELINE_VERSION = '1.3.0';
const STEP_VERSIONS = {
  collector: '1.0.0',
  reader_pdf: '1.1.0', // Tesseract fallback for scanned PDFs
  reader_ocr: 'Tesseract-7.0.0',
  reader_email: '1.0.0',
  reader_rtf: '1.0.0', // RTF → plain text via regex stripper
  reader_media: '1.0.0', // audio/video transcription via Whisper CLI
};

// Minimum real-word count before we consider a PDF extraction "sparse"
// and fall back to Tesseract page rendering.
const OCR_FALLBACK_WORD_THRESHOLD = 50;

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';

// Default AI integration to Exo cluster unless explicitly disabled
if (!process.env.ENABLE_AI_ENRICHMENT) {
  process.env.ENABLE_AI_ENRICHMENT = 'true';
}
if (!process.env.AI_PROVIDER) {
  process.env.AI_PROVIDER = 'exo_cluster';
}

interface CollectionConfig {
  name: string;
  rootPath: string;
  description: string;
  enabled: boolean;
}

const COLLECTIONS: CollectionConfig[] = [
  {
    name: 'Test',
    rootPath: 'data/ingest',
    description: 'Dev/Test collection',
    enabled: false,
  },
  {
    name: 'Epstein Estate Documents - Seventh Production',
    rootPath: 'data/originals/Epstein Estate Documents - Seventh Production',
    description: 'Seventh Production of Estate Documents',
    enabled: false,
  },
  {
    name: 'DOJ Data Set 1',
    rootPath: 'data/originals/DOJ VOL00001',
    description: 'DOJ Data Set 1',
    enabled: false,
  },
  {
    name: 'DOJ Data Set 2',
    rootPath: 'data/originals/DOJ VOL00002',
    description: 'DOJ Data Set 2',
    enabled: false,
  },
  {
    name: 'DOJ Data Set 3',
    rootPath: 'data/originals/DOJ VOL00003',
    description: 'DOJ Data Set 3',
    enabled: false,
  },
  {
    name: 'DOJ Data Set 4',
    rootPath: 'data/originals/DOJ VOL00004',
    description: 'DOJ Data Set 4',
    enabled: false,
  },
  {
    name: 'DOJ Data Set 5',
    rootPath: 'data/originals/DOJ VOL00005',
    description: 'DOJ Data Set 5',
    enabled: false,
  },
  {
    name: 'DOJ Data Set 6',
    rootPath: 'data/originals/DOJ VOL00006',
    description: 'DOJ Data Set 6',
    enabled: false,
  },
  {
    name: 'DOJ Data Set 7',
    rootPath: 'data/originals/DOJ VOL00007',
    description: 'DOJ Data Set 7',
    enabled: false,
  },
  {
    name: 'DOJ Data Set 8',
    rootPath: 'data/originals/DOJ VOL00008',
    description: 'DOJ Data Set 8',
    enabled: false,
  },
  {
    name: 'Court Case Evidence',
    rootPath: 'data/originals/Court Case Evidence',
    description: 'Various Court Exhibits',
    enabled: false,
  },
  {
    name: 'Maxwell Proffer',
    rootPath: 'data/originals/Maxwell Proffer',
    description: 'Ghislaine Maxwell Proffer Documents',
    enabled: false,
  },
  {
    name: 'DOJ Phase 1',
    rootPath: 'data/originals/DOJ Phase 1',
    description: 'DOJ Phase 1 Documents',
    enabled: false,
  },
  {
    name: 'Evidence',
    rootPath: 'data/media/images/Evidence',
    description: 'Miscellaneous evidence images',
    enabled: true,
  },
  {
    name: 'Confirmed Fake',
    rootPath: 'data/media/images/Confirmed Fake',
    description: 'Images confirmed to be fake/AI generated',
    enabled: true,
  },
  {
    name: 'Unconfirmed Claims',
    rootPath: 'data/media/images/Unconfirmed Claims',
    description: 'Images with unverified claims',
    enabled: true,
  },
  {
    name: 'DOJ Data Set 9',
    rootPath: 'data/ingest/DOJVOL00009/www.justice.gov/epstein/files/DataSet 9',
    description: '12,260 PDF files released Feb 1, 2026',
    enabled: true,
  },
  {
    name: 'DOJ Data Set 10',
    rootPath: 'data/ingest/DOJVOL00010',
    description: 'Data Set 10 from DOJ',
    enabled: true,
  },
  {
    name: 'DOJ Data Set 11',
    rootPath: 'data/ingest/DOJVOL00011/www.justice.gov/epstein/files/DataSet 11',
    description: 'Data Set 11 (Videos) from DOJ',
    enabled: true,
  },
  {
    name: 'DOJ Data Set 12',
    rootPath: 'data/ingest/DOJVOL00012',
    description: 'Data Set 12 from DOJ',
    enabled: false,
  },
];

// ============================================================================
// DATABASE SETUP
// ============================================================================

// Database instance placeholder
let db: any;

async function initDb() {
  db = getIngestPool();
  console.log('Database gateway initialized (Postgres ingest pool)');
}

import { PipelineService, PipelineRun } from '../src/server/services/pipelineService.js';
import { jobsRepository } from '../src/server/db/jobsRepository.js';
import { AssetService } from '../src/server/services/assetService.js';
import { JobManager } from '../src/server/services/JobManager.js';

let currentRun: PipelineRun;

async function startPipelineRun() {
  console.log(`🚀 Initializing Pipeline Run v${PIPELINE_VERSION}...`);
  currentRun = await PipelineService.startRun(PIPELINE_VERSION, {
    collections: COLLECTIONS.filter((c) => c.enabled).map((c) => c.name),
    step_versions: STEP_VERSIONS,
  });
  console.log(`   Run UUID: ${currentRun.run_uuid}`);

  // Register basic steps
  await PipelineService.registerStep('discovery', 'Initial file discovery and hashing');
  await PipelineService.registerStep('ingestion', 'Document ingestion and processing');
  await PipelineService.registerStep('extraction', 'Text extraction and OCR');
  await PipelineService.registerStep('intelligence', 'Entity extraction and relationship mapping');
}

async function verifyDatabase() {
  console.log('✅ Verifying database connection...');
  try {
    const count = ((await db.query('SELECT COUNT(*) as count FROM documents')).rows[0] ?? null) as {
      count: number;
    };
    console.log(`   Database connected. ${count.count} documents currently in database.`);
    return true;
  } catch (e) {
    console.error('❌ Database connection failed:', e);
    return false;
  }
}

// ============================================================================
// FILE UTILITIES
// ============================================================================

async function detectMimeType(filePath: string): Promise<string> {
  return new Promise((resolve) => {
    execFile('file', ['--mime-type', '-b', filePath], (err, stdout) => {
      if (err) {
        // Fallback to extension-based if 'file' fails
        const ext = extname(filePath).toLowerCase();
        const map: Record<string, string> = {
          '.pdf': 'application/pdf',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.eml': 'message/rfc822',
          '.txt': 'text/plain',
          '.rtf': 'application/rtf',
          '.mp4': 'video/mp4',
          '.mov': 'video/quicktime',
          '.avi': 'video/x-msvideo',
          '.mkv': 'video/x-matroska',
          '.m4v': 'video/mp4',
          '.mp3': 'audio/mpeg',
          '.wav': 'audio/wav',
          '.m4a': 'audio/mp4',
          '.aac': 'audio/aac',
          '.flac': 'audio/flac',
        };
        return resolve(map[ext] || 'application/octet-stream');
      }
      resolve(stdout.trim());
    });
  });
}

// ============================================================================
// PDF & IMAGE TEXT EXTRACTION
// ============================================================================

// ============================================================================
// PDF & IMAGE TEXT EXTRACTION
// ============================================================================

import { discoveryRepository } from '../src/server/db/discoveryRepository.js';
import {
  RedactionClassifier,
  RedactionInference,
} from '../src/server/services/RedactionClassifier.js';

async function extractTextFromPdf(buffer: Buffer): Promise<{
  text: string;
  pageCount: number;
  pages: { text: string; pageNumber: number; source: 'visible_layer' | 'ocr' }[];
}> {
  try {
    const parser = new PDFParse(new Uint8Array(buffer));
    const data = await parser.getText();
    const info = await parser.getInfo();

    // Attempt page-level extraction if available in this parser
    // Note: older pdf-parse might not provide clear page boundaries easily
    // We'll fall back to rendering if we need granular page tracking.
    const pages = [];
    if (data?.text) {
      // Split by form feed if available, or just treat as page 1 for now if we can't tell
      const rawPages = data.text.split('\f');
      for (let i = 0; i < rawPages.length; i++) {
        pages.push({
          text: rawPages[i].trim(),
          pageNumber: i + 1,
          source: 'visible_layer' as const,
        });
      }
    }

    return {
      text: data?.text || '',
      pageCount: info?.numpages || pages.length || 0,
      pages,
    };
  } catch (e) {
    console.warn('  ⚠️  PDF extraction failed:', (e as Error).message);
    return { text: '', pageCount: 0, pages: [] };
  }
}

async function extractTextFromImage(
  filePath: string,
): Promise<{ text: string; pageCount: number }> {
  try {
    const worker = await createWorker('eng');
    const {
      data: { text },
    } = await worker.recognize(filePath);
    await worker.terminate();
    return {
      text: text || '',
      pageCount: 1,
    };
  } catch (e) {
    console.warn('  ⚠️  Image OCR failed:', (e as Error).message);
    return { text: '', pageCount: 1 };
  }
}

/**
 * Strip RTF markup and return plain text.
 * Handles control words, hex escapes (\'XX), ignorable destinations,
 * and nested groups. Works for all common RTF v1.x documents.
 */
function stripRtf(rtf: string): string {
  let text = rtf;

  // Remove ignorable destinations (\*\keyword ... ) entirely — these hold
  // generator tags, font tables, stylesheets, etc., never useful body text.
  text = text.replace(/\{\\\*\\[a-zA-Z]+[^{}]*\}/gs, '');

  // Remove embedded pictures / OLE objects (can be large binary blobs)
  text = text.replace(/\{\\(?:pict|object|objdata)[^}]*\}/gs, '');

  // Decode Windows-1252 hex escapes \'XX → character
  text = text.replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => {
    const code = parseInt(hex, 16);
    // Map common Win-1252 extras that differ from Latin-1
    const win1252: Record<number, string> = {
      0x80: '€',
      0x82: '‚',
      0x83: 'ƒ',
      0x84: '„',
      0x85: '…',
      0x86: '†',
      0x87: '‡',
      0x88: 'ˆ',
      0x89: '‰',
      0x8a: 'Š',
      0x8b: '‹',
      0x8c: 'Œ',
      0x91: '\u2018',
      0x92: '\u2019',
      0x93: '\u201c',
      0x94: '\u201d',
      0x95: '•',
      0x96: '–',
      0x97: '—',
      0x99: '™',
      0x9a: 'š',
      0x9c: 'œ',
    };
    return win1252[code] ?? String.fromCharCode(code);
  });

  // Replace paragraph / line-break control words with newlines
  text = text.replace(/\\(?:par|line|page)\b\s*/g, '\n');

  // Replace tab control word with tab character
  text = text.replace(/\\tab\b\s*/g, '\t');

  // Remove all remaining control words (e.g. \b, \i, \f0, \cf1, \fs24 …)
  text = text.replace(/\\[a-zA-Z]+[-\d]* ?/g, '');

  // Remove control symbols (\ followed by a single non-alpha, e.g. \~, \-, \:)
  text = text.replace(/\\[^a-zA-Z\r\n]/g, '');

  // Remove group delimiters
  text = text.replace(/[{}]/g, '');

  // Normalise whitespace: collapse runs, trim
  return text
    .replace(/\r\n|\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Tesseract OCR fallback for scanned PDFs.
 * Renders each page via sharp (which uses libvips+poppler) and OCRs it.
 * Called when pdf-parse returns sparse/empty text — i.e. the PDF has no
 * embedded text layer (pure image scan).
 */
async function ocrFallbackForPdf(
  pdfPath: string,
  pageCount: number,
): Promise<{
  text: string;
  pages: { text: string; pageNumber: number; source: 'ocr' }[];
}> {
  const pages: { text: string; pageNumber: number; source: 'ocr' }[] = [];
  const worker = await createWorker('eng');

  try {
    for (let i = 0; i < pageCount; i++) {
      try {
        // Render PDF page to a high-res PNG buffer — same path sharp already
        // uses for phash generation, so we know this works on this corpus.
        const imageBuffer = await sharp(pdfPath, { page: i })
          .resize({ width: 2400 }) // ~300 DPI equivalent — sweet spot for Tesseract
          .png()
          .toBuffer();

        const {
          data: { text },
        } = await worker.recognize(imageBuffer);
        pages.push({ text: text.trim(), pageNumber: i + 1, source: 'ocr' });
      } catch (pageErr) {
        console.warn(`  ⚠️  OCR failed on page ${i + 1}:`, (pageErr as Error).message);
        pages.push({ text: '', pageNumber: i + 1, source: 'ocr' });
      }
    }
  } finally {
    await worker.terminate();
  }

  return {
    text: pages.map((p) => p.text).join('\n\n'),
    pages,
  };
}

const FFMPEG_BIN = '/usr/local/bin/ffmpeg';
const WHISPER_BIN = '/usr/local/bin/whisper';
// Whisper model to use for transcription. 'base' balances speed and accuracy
// well for phone-quality recordings common in surveillance/legal evidence.
// Upgrade to 'medium' or 'large' for cleaner studio audio.
const WHISPER_MODEL = process.env.WHISPER_MODEL || 'base';
// Hard ceiling per file so a 3-hour video doesn't monopolise the pipeline
const WHISPER_TIMEOUT_MS = parseInt(process.env.WHISPER_TIMEOUT_MS || String(30 * 60 * 1000), 10);

/**
 * Transcribe an audio or video file using the local OpenAI Whisper CLI.
 *
 * Steps:
 *  1. ffmpeg extracts a 16 kHz mono WAV (optimal format for Whisper, avoids
 *     issues with exotic video containers).
 *  2. whisper writes a plain-text transcript to a temp directory.
 *  3. We read the .txt file and return the text + media duration in seconds.
 *
 * Errors are non-fatal: on any failure we return empty text so the document
 * still gets a DB record (with processing_status reflecting the gap).
 */
async function transcribeMedia(
  filePath: string,
): Promise<{ text: string; durationSeconds: number }> {
  const tmpDir = mkdtempSync(join(tmpdir(), 'epstein-media-'));
  const audioPath = join(tmpDir, 'audio.wav');

  try {
    // ── Step 1: extract audio ──────────────────────────────────────────────
    await new Promise<void>((resolve, reject) => {
      execFile(
        FFMPEG_BIN,
        [
          '-i',
          filePath,
          '-ar',
          '16000', // 16 kHz sample rate
          '-ac',
          '1', // mono
          '-f',
          'wav',
          '-y',
          audioPath, // overwrite if exists
        ],
        { timeout: 5 * 60 * 1000 },
        (err) => (err ? reject(err) : resolve()),
      );
    });

    // ── Step 2: probe duration via ffprobe ─────────────────────────────────
    let durationSeconds = 0;
    try {
      const probe = await new Promise<string>((resolve, reject) => {
        execFile(
          '/usr/local/bin/ffprobe',
          [
            '-v',
            'error',
            '-show_entries',
            'format=duration',
            '-of',
            'default=noprint_wrappers=1:nokey=1',
            filePath,
          ],
          (err, stdout) => (err ? reject(err) : resolve(stdout.trim())),
        );
      });
      durationSeconds = parseFloat(probe) || 0;
    } catch {
      // Duration is optional metadata; don't fail ingestion over it
    }

    // ── Step 3: transcribe ─────────────────────────────────────────────────
    await new Promise<void>((resolve, reject) => {
      execFile(
        WHISPER_BIN,
        [
          audioPath,
          '--model',
          WHISPER_MODEL,
          '--output_format',
          'txt',
          '--output_dir',
          tmpDir,
          '--verbose',
          'False',
          '--language',
          'en', // Epstein corpus is English-dominant
        ],
        { timeout: WHISPER_TIMEOUT_MS },
        (err) => (err ? reject(err) : resolve()),
      );
    });

    // Whisper names the output file after the input stem (audio.txt)
    const txtPath = join(tmpDir, 'audio.txt');
    const text = existsSync(txtPath) ? readFileSync(txtPath, 'utf-8').trim() : '';
    return { text, durationSeconds };
  } catch (err) {
    console.warn(`  ⚠️  Transcription failed for ${basename(filePath)}:`, (err as Error).message);
    return { text: '', durationSeconds: 0 };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Run the Python unredact pipeline on a PDF and return the path to the
 * unredacted PDF if successful, otherwise fall back to the original.
 *
 * This is intentionally conservative: failures will not break ingestion,
 * they just skip unredaction.
 */
interface UnredactionResult {
  pdfPath: string;
  unredactedSpans?: any[]; // Raw JSON from script
}

/**
 * Run the Python unredact pipeline on a PDF and return the path to the
 * unredacted PDF if successful, otherwise fall back to the original.
 *
 * Also returns unredacted span data if available.
 */
async function maybeUnredactPdf(originalPath: string): Promise<UnredactionResult> {
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
          let unredactedSpans = [];

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

// ============================================================================
// WATERMARKING
// ============================================================================

async function applyWatermark(
  filePath: string,
  collectionName: string,
  originalAssetId: number,
): Promise<{ derivativePath: string; sha256: string; assetId: number } | null> {
  // Only target specific collections
  if (collectionName !== 'Confirmed Fake' && collectionName !== 'Unconfirmed Claims') return null;

  // Only verify images
  const ext = extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return null;

  const filename = basename(filePath);
  const derivativeDir = join(process.cwd(), 'data/derivatives/watermarked');
  const derivativePath = join(derivativeDir, filename);

  console.log(`   🔒 Creating watermarked derivative: ${filename}`);

  try {
    if (!fs.existsSync(derivativeDir)) {
      mkdirSync(derivativeDir, { recursive: true });
    }

    // Apply watermark with sharp
    const metadata = await sharp(filePath).metadata();
    const width = metadata.width || 1000;
    const height = metadata.height || 1000;

    const fontSize = Math.floor(width * 0.15); // 15% of width
    const svgImage = `
      <svg width="${width}" height="${height}">
        <style>
          .title { fill: rgba(255, 0, 0, 0.5); font-size: ${fontSize}px; font-weight: bold; font-family: sans-serif; }
        </style>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" class="title" transform="rotate(-45, ${width / 2}, ${height / 2})">FAKE</text>
      </svg>
    `;

    await sharp(filePath)
      .composite([{ input: Buffer.from(svgImage), top: 0, left: 0 }])
      .toFile(derivativePath);

    const derivativeBuffer = fs.readFileSync(derivativePath);
    const derivativeSha256 = crypto.createHash('sha256').update(derivativeBuffer).digest('hex');
    const derivativeSize = fs.statSync(derivativePath).size;
    const mimeType = await detectMimeType(derivativePath);

    const derivativeAssetId = await AssetService.registerAsset({
      storagePath: derivativePath,
      sha256: derivativeSha256,
      mimeType,
      fileSize: derivativeSize,
      isOriginal: false,
      originalAssetId,
      derivativeKind: 'watermarked',
      derivativeParamsJson: JSON.stringify({
        text: 'FAKE',
        placement: 'center',
        rotation: -45,
        opacity: 0.5,
        applied_at: new Date().toISOString(),
      }),
    });

    console.log(`   ✅ Watermarked derivative created and registered.`);
    return { derivativePath, sha256: derivativeSha256, assetId: derivativeAssetId };
  } catch (e) {
    console.error('   ❌ Failed to create watermarked derivative:', e);
    return null;
  }
}

// ============================================================================
// DOCUMENT INGESTION
// ============================================================================

interface ProcessedDocument {
  success: boolean;
  documentId?: number;
  error?: string;
}

async function estimateTextCoverage(text: string, pageCount: number): Promise<number> {
  if (!text || pageCount <= 0) return 0;
  // Very rough heuristic: words per page, capped to avoid extreme outliers
  const words = (text.match(/\b[\w']+\b/g) || []).length;
  const wordsPerPage = words / pageCount;
  const normalized = Math.min(wordsPerPage / 350, 1); // assume ~350 words/page is "full"
  return normalized;
}

/**
 * Calculate a quality score for OCR text (0.0 to 1.0).
 * Based on basic word-to-garbage ratio.
 */
function calculateOcrScore(text: string): number {
  if (!text || text.length < 50) return 0;
  const words = text.match(/\b[a-zA-Z]{2,}\b/g) || [];
  const totalTokens = text.match(/\S+/g) || [];
  if (totalTokens.length === 0) return 0;

  // Ratio of "real words" to total tokens
  const score = words.length / totalTokens.length;
  return Math.min(score * 1.2, 1.0); // Slight boost for common short words not caught by regex
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

/**
 * Split text into sentences and store them.
 */
async function storeSentences(
  documentId: number,
  pageId: number | undefined,
  text: string,
): Promise<void> {
  if (!text) return;

  // Simple sentence splitter
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10); // Filter out noise

  for (let i = 0; i < sentences.length; i++) {
    try {
      await discoveryRepository.addSentence({
        document_id: documentId,
        page_id: pageId,
        sentence_index: i,
        sentence_text: sentences[i],
      });
    } catch {
      // Non-fatal: sentence storage failure should not kill the pipeline
    }
  }
}

async function storeGranularData(
  documentId: number,
  content: string,
  mimeType: string,
  ext: string,
  pages: any[] | undefined,
  filePath: string,
) {
  if ((ext === '.pdf' || mimeType === 'application/pdf') && pages && pages.length > 0) {
    for (const page of pages) {
      const ocrScore = calculateOcrScore(page.text);

      // Generate pHash for this page
      // page.pageNumber is 1-indexed, sharp uses 0-indexed
      const phash = await generatePagePhash(filePath, page.pageNumber - 1);

      const pageId = await discoveryRepository.addPage({
        document_id: documentId,
        page_number: page.pageNumber,
        extracted_text: page.text,
        text_source: page.source,
        ocr_quality_score: ocrScore,
        phash: phash || undefined,
      });
      await storeSentences(documentId, pageId, page.text);
    }
  } else {
    // Single page / non-PDF
    const ocrScore = calculateOcrScore(content);
    // Try to get pHash if it's an image?
    // We already computed pHash for identity at file level.
    // Here we want page-level. For image, page pHash == file pHash.
    // We can re-use or re-compute. Let's re-compute to be safe/simple logic.
    let phash: string | undefined;
    if (mimeType.startsWith('image/')) {
      phash = await generatePhash(filePath);
    }

    const pageId = await discoveryRepository.addPage({
      document_id: documentId,
      page_number: 1,
      extracted_text: content,
      text_source: mimeType.startsWith('image/') ? 'ocr' : 'visible_layer',
      ocr_quality_score: ocrScore,
      phash,
    });
    await storeSentences(documentId, pageId, content);
  }
}

async function storeRedactions(documentId: number, content: string, unredactedSpans: any[] | null) {
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
            // fall back to deterministic inference
          }

          await db.query(insertSpanSql, [
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

      await db.query(insertSpanSql, [
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
      await db.query(
        'UPDATE documents SET has_redactions = true, redaction_count = $1 WHERE id = $2',
        [count, documentId],
      );
      console.log(`\n      Stored ${count} redactions for doc ${documentId}`);
    }
  } catch (e) {
    console.warn('   Failed to store redactions:', e);
  }
}

async function processArchive(filePath: string): Promise<{
  members: { filename: string; content: Buffer; size: number }[];
  isEncrypted: boolean;
}> {
  try {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();
    const members: { filename: string; content: Buffer; size: number }[] = [];
    let totalBytes = 0;
    const MAX_FILES = 500;
    const MAX_BYTES = 1024 * 1024 * 1024; // 1GB

    for (const entry of entries) {
      if (entry.isDirectory) continue;
      if (members.length >= MAX_FILES) {
        console.warn(`   ⚠️ Archive limit reached (${MAX_FILES} files). Skipping remainder.`);
        break;
      }

      // Zip-slip protection
      const targetDir = path.resolve('data/extracted');
      const resolvedPath = path.resolve(targetDir, entry.entryName);
      if (!resolvedPath.startsWith(targetDir)) {
        console.warn(`   ⚠️ Zip-slip attempt detected: ${entry.entryName}. Skipping.`);
        continue;
      }

      const content = entry.getData();
      if (totalBytes + content.length > MAX_BYTES) {
        console.warn(`   ⚠️ Archive size limit reached (1GB). Skipping remainder.`);
        break;
      }

      members.push({
        filename: path.basename(entry.entryName),
        content,
        size: entry.header.size,
      });
      totalBytes += content.length;
    }

    return { members, isEncrypted: false };
  } catch (error: any) {
    if (error.message && error.message.includes('encrypted')) {
      return { members: [], isEncrypted: true };
    }
    throw error;
  }
}

async function processEmail(filePath: string): Promise<{
  content: string;
  metadata: any;
  date?: string;
}> {
  try {
    const rawContent = await fs.promises.readFile(filePath);

    // Check if it's a JSON metadata file
    if (filePath.endsWith('.meta') || rawContent.toString().trim().startsWith('{')) {
      try {
        const json = JSON.parse(rawContent.toString());
        let content = '';
        if (json.metadata && typeof json.metadata === 'string') {
          content = json.metadata.replace(/^[a-z0-9]+:[a-z0-9]+:/, '');
        }
        const metadata = {
          from: json.sender || '',
          to: json.recipient || '',
          subject: json.subject || '',
          date: json.date ? new Date(json.date * 1000).toISOString() : undefined,
          messageId: json.id?.toString() || '',
        };
        const resolution = RedactionResolver.resolve(content, {
          sender: metadata.from,
          receiver: metadata.to,
          subject: metadata.subject,
          date: metadata.date,
        });
        return {
          content: resolution.resolvedText || '[Metadata Record Only]',
          metadata,
          date: metadata.date,
        };
      } catch (e) {
        // ignore
      }
    }

    const parsed = await simpleParser(rawContent);

    // Prefer text body, fallback to html-to-text
    let textBody = parsed.text;
    if (!textBody && parsed.html) {
      textBody = convert(parsed.html, {
        wordwrap: 130,
      });
    }

    // Fallback to raw string if parsing failed completely but we have content
    // (though usually simpleParser throws if it fails)
    if (!textBody && !parsed.html) {
      textBody = rawContent.toString('utf-8');
    }

    const cleanText = await TextCleaner.cleanEmailTextAsync(textBody || '', parsed.subject || '');

    // Extract metadata
    const getAddressText = (addr: any) => {
      if (!addr) return '';
      if (Array.isArray(addr)) return addr.map((a) => a.text).join(', ');
      return addr.text || '';
    };

    const metadata = {
      from: getAddressText(parsed.from),
      to: getAddressText(parsed.to),
      subject: parsed.subject || '',
      date: parsed.date ? parsed.date.toISOString() : undefined,
      cc: getAddressText(parsed.cc),
      messageId: parsed.messageId || '',
      inReplyTo: parsed.inReplyTo || '',
    };

    // Apply Redaction Resolver
    const resolution = RedactionResolver.resolve(cleanText, {
      sender: metadata.from,
      receiver: metadata.to,
      subject: metadata.subject,
      date: metadata.date,
    });

    return {
      content: resolution.resolvedText,
      metadata,
      date: metadata.date,
    };
  } catch (error) {
    console.warn(`  ⚠️  Email parsing failed for ${path.basename(filePath)}:`, error);
    // Fallback to raw text read if parser crashes
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    return {
      content: raw,
      metadata: { error: 'Parse failed' },
      date: undefined,
    };
  }
}

async function processDocument(
  filePath: string,
  collection: CollectionConfig,
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
        await db.query(
          `SELECT id, content_sha256, processing_status,
                  (content IS NOT NULL AND length(content) > 50) AS has_content
           FROM documents
           WHERE (file_path = $1 OR file_path = $2 OR file_path = $3)`,
          [filePath, encodedPath, spaceEncodedPath],
        )
      ).rows[0] ?? null;

    let sha256: string = '';

    if (pathCheck && pathCheck.content_sha256) {
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
      // Hard path: Read and hash the file
      const buffer = readFileSync(filePath);
      sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

      // Check by SHA-256 for deduplication
      existingDoc =
        (
          await db.query(
            `SELECT id, processing_status,
                    (content IS NOT NULL AND length(content) > 50) AS has_content
             FROM documents WHERE content_sha256 = $1`,
            [sha256],
          )
        ).rows[0] ?? null;
    }

    if (!existingDoc) {
      // Create skeleton document atomically
      try {
        const result =
          (
            await db.query(
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
                currentRun.id,
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
      } catch (e) {
        // ... (rest as before but async)
        existingDoc =
          (
            await db.query(
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
        await db.query(
          "SELECT id FROM processing_jobs WHERE target_type = 'document' AND target_id = $1 AND step_name = 'ingestion'",
          [(existingDoc as any).id],
        )
      ).rows[0] ?? null;
    if (!job) {
      await db.query(
        'INSERT INTO processing_jobs (run_id, step_name, target_type, target_id, max_attempts) VALUES ($1, $2, $3, $4, $5)',
        [currentRun.id, 'ingestion', 'document', (existingDoc as any).id, 5],
      );
    }

    // Attempt to lease specifically for this document
    const leaseResult = await db.query(
      `UPDATE processing_jobs
       SET status = 'running', locked_by = $1, locked_at = CURRENT_TIMESTAMP, attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP
       WHERE target_type = 'document' AND target_id = $2 AND step_name = 'ingestion'
         AND (status = 'queued' OR (status = 'running' AND locked_at < NOW() - INTERVAL '10 minutes'))`,
      [currentRun.run_uuid, (existingDoc as any).id],
    );

    if (leaseResult.rowCount === 0) {
      console.log(`   ⏳ Could not lease job for ${basename(filePath)} (locked by another worker)`);
      return { success: true };
    }

    // We need the job object for later code that expects 'leasedJob.id'
    const leasedJob =
      (
        await db.query(
          "SELECT id FROM processing_jobs WHERE target_type = 'document' AND target_id = $1 AND step_name = 'ingestion'",
          [(existingDoc as any).id],
        )
      ).rows[0] ?? null;

    // If we are here, we own the lease for (existingDoc as any).id
    documentId = (existingDoc as any).id;
    console.log(`   ⚙️  Processing document ${documentId}: ${basename(filePath)}`);

    // fallback check by path (legacy)
    const existingPath =
      (await db.query('SELECT id FROM documents WHERE file_path = $1', [filePath])).rows[0] ?? null;
    if (existingPath) {
      console.log(`   Updating legacy path entry with SHA-256: ${basename(filePath)}`);
      await db.query('UPDATE documents SET content_sha256 = $1 WHERE id = $2', [
        sha256,
        (existingPath as any).id,
      ]);
      return { success: true, documentId: (existingPath as any).id };
    }

    // Register Asset
    const mimeType = await detectMimeType(filePath);
    const stats = statSync(filePath);
    const ext = extname(filePath).toLowerCase();
    const existingAsset = await AssetService.findBySha256(sha256);

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
      phash = await generatePhash(filePath);
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
          runId: currentRun.id,
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
        db,
      );

      await documentProvenanceService.upsertEvent(
        {
          documentId,
          runId: currentRun.id,
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
        db,
      );
    }

    // Apply watermark if needed (Creates a derivative asset)
    const derivative = await applyWatermark(filePath, collection.name, assetId);
    if (documentId && derivative) {
      await documentProvenanceService.upsertEvent(
        {
          documentId,
          runId: currentRun.id,
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
        db,
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
      } catch (e) {
        // ignore invalid json
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

      if (
        pdfPathForOcr !== filePath &&
        unredactedText &&
        unredactedText.length > originalText.length
      ) {
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
      const result = await processEmail(filePath);
      content = result.content;
      meta.metadata_json = JSON.stringify(result.metadata);
      if (result.date) {
        meta.date_created = result.date;
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
      (meta as any).transcribedBy = `whisper-${WHISPER_MODEL}`;
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
      aiSummary = null;
    }
    if (aiSummary) {
      metadataObj.aiSummary = aiSummary;
    }
    const wordCount = content ? (content.match(/\b[\w']+\b/g) || []).length : 0;
    const normalizedTextSha256 = content ? computeSha256Hex(content) : null;
    metadataObj.provenance = {
      file_sha256: sha256,
      normalized_text_sha256: normalizedTextSha256,
      ingestion_run_id: currentRun.id,
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
    await db.query(
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
          runId: currentRun.id,
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
        db,
      );

      if (metaOverride?.parent_document_id) {
        await documentProvenanceService.upsertEvent(
          {
            documentId,
            runId: currentRun.id,
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
          db,
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
        db,
      );
    }

    // Phase 9: Sync Job Completion
    if (leasedJob) {
      await db.query(
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
          await processDocument(attPath, collection, {
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
          await processDocument(memberPath, collection, {
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
      await storeGranularData(documentId, content, mimeType, ext, granularPages, filePath);
    }

    // Store Redactions (Phase 7)
    if (documentId) {
      await storeRedactions(documentId, content, unredactedSpans || null);
    }

    return { success: true, documentId: documentId };
  } catch (error) {
    if (typeof documentId !== 'undefined') {
      const job =
        (
          await db.query(
            'SELECT id FROM processing_jobs WHERE target_type = $1 AND target_id = $2 AND step_name = $3 AND status = $4',
            ['document', documentId, 'ingestion', 'running'],
          )
        ).rows[0] ?? null;
      if (job) {
        const isRetryable =
          !(error as Error).message.includes('corrupt') &&
          !(error as Error).message.includes('encrypted');
        await db.query(
          'UPDATE processing_jobs SET status = $1, last_error = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [isRetryable ? 'failed_retryable' : 'failed_permanent', (error as Error).message, job.id],
        );
      }
    }
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Generates a 64-bit pHash (Average Hash) for an image using sharp.
 */
async function generatePhash(filePath: string): Promise<string> {
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
    return '';
  }
}

/**
 * Generates pHash for a specific page of a PDF using sharp.
 */
async function generatePagePhash(filePath: string, pageIndex: number): Promise<string> {
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
  } catch (err) {
    // console.warn(`  ⚠️ Page ${pageIndex} pHash failed:`, err);
    return ''; // specific page might fail or be blank
  }
}

// ============================================================================
// COLLECTION PROCESSING
// ============================================================================

const INGEST_EXTENSIONS = new Set([
  'pdf',
  'txt',
  'rtf',
  'jpg',
  'jpeg',
  'png',
  'eml',
  'msg',
  'meta',
  'html',
  'mp4',
  'mov',
  'avi',
  'mkv',
  'm4v',
  'wav',
  'mp3',
  'm4a',
  'aac',
  'flac',
]);

/**
 * Stream files from a directory tree one entry at a time.
 * Uses fs.opendir (async, streaming) instead of glob to avoid OOM on
 * directories with 300K+ files. Follows symlinks to support volumes mounted
 * via symlink (e.g. data/ingest/DOJVOL00009 → /Volumes/Music/Torrents/...).
 */
async function* walkDir(dir: string): AsyncGenerator<string> {
  let d;
  try {
    d = await opendir(dir);
  } catch {
    return;
  }
  for await (const entry of d) {
    if (entry.name === '.DS_Store' || entry.name.startsWith('._')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.toLowerCase() !== 'thumbs') yield* walkDir(full);
    } else if (entry.isSymbolicLink()) {
      try {
        const s = statSync(full);
        if (s.isDirectory()) {
          if (entry.name.toLowerCase() !== 'thumbs') yield* walkDir(full);
        } else if (s.isFile()) {
          const ext = extname(entry.name).slice(1).toLowerCase();
          if (INGEST_EXTENSIONS.has(ext)) yield full;
        }
      } catch {
        /* broken symlink */
      }
    } else if (entry.isFile()) {
      const ext = extname(entry.name).slice(1).toLowerCase();
      if (INGEST_EXTENSIONS.has(ext)) yield full;
    }
  }
}

async function processCollection(
  collection: CollectionConfig,
): Promise<{ processed: number; skipped: number; errors: number }> {
  console.log(`\n📦 Processing: ${collection.name}`);
  console.log(`   Path: ${collection.rootPath}`);

  if (!existsSync(collection.rootPath)) {
    console.log(`   ⚠️  Directory not found, skipping...`);
    return { processed: 0, skipped: 0, errors: 0 };
  }

  // Stream files via walkDir (fs.opendir) — reads one entry at a time to avoid
  // OOM / event-loop blocking on collections with 300K+ files in one directory.
  const CONCURRENCY_LIMIT = parseInt(process.env.INGEST_CONCURRENCY || '30', 10);
  let activePromises = 0;
  const completionCallbacks: Array<() => void> = [];

  const waitForSlot = (): Promise<void> => {
    if (activePromises < CONCURRENCY_LIMIT) return Promise.resolve();
    return new Promise<void>((resolve) => completionCallbacks.push(resolve));
  };

  const releaseSlot = (): void => {
    activePromises--;
    if (completionCallbacks.length > 0) completionCallbacks.shift()!();
  };

  const results: { processed: number; skipped: number; errors: number } = {
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  for await (const file of walkDir(collection.rootPath)) {
    await waitForSlot();
    activePromises++;

    processDocument(file, collection)
      .then((result) => {
        if (result.success && result.documentId) {
          results.processed++;
          if (results.processed % 50 === 0) {
            process.stdout.write(
              `   Progress: ${results.processed} processed (Active: ${activePromises})...\r`,
            );
          }
        } else if (result.success) {
          results.skipped++;
        } else {
          results.errors++;
          console.error(`   ❌ Error processing ${basename(file)}: ${result.error}`);
        }
      })
      .catch((err) => {
        results.errors++;
        console.error(`   ❌ Unhandled error processing ${basename(file)}:`, err);
      })
      .finally(releaseSlot);
  }

  // Drain any remaining in-flight work
  while (activePromises > 0) {
    await new Promise<void>((resolve) => completionCallbacks.push(resolve));
  }

  console.log(
    `   ✅ Complete: ${results.processed} processed, ${results.skipped} skipped, ${results.errors} errors`,
  );

  return results;
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const modeIdx = args.indexOf('--mode');
  const mode = modeIdx >= 0 ? args[modeIdx + 1] : 'full';

  console.log('='.repeat(80));
  console.log('🚀 UNIFIED DATA INGESTION PIPELINE');
  console.log('='.repeat(80));
  console.log();
  console.log(`🧭 Mode: ${mode}`);
  console.log();

  // Enforce Exo Cluster for Max Performance
  process.env.AI_PROVIDER = 'exo_cluster';
  process.env.ENABLE_AI_ENRICHMENT = 'true';
  console.log('🚀 Configuring AI Provider: Exo Cluster (Concurrency Enabled)');
  if (process.env.EXO_MODEL) {
    console.log(`   🎯 Targeting Exo Model: ${process.env.EXO_MODEL}`);
  } else {
    console.log('   💡 Hint: Set EXO_MODEL to target a specific model (e.g. EXO_MODEL=14BE042F)');
  }

  // Initialize DB
  await initDb();

  // Verify database
  if (!(await verifyDatabase())) {
    console.error('❌ Database verification failed. Exiting.');
    process.exit(1);
  }

  if (mode === 'queue-only') {
    console.log('⏭️  Skipping file ingestion. Running queue processor only.\n');
    await processQueue();
    return;
  }

  if (mode === 'enrich-only') {
    console.log('🧠 AI enrichment backfill: summaries for completed docs.\n');
    await enrichCompleted();
    return;
  }

  if (mode === 'ocr-clean') {
    console.log('🔧 OCR cleaning backfill: cleaning text for completed docs.\n');
    await ocrCleanCompleted();
    return;
  }

  // Start Pipeline Run
  await startPipelineRun();

  console.log();

  // Process each collection
  const stats = {
    totalProcessed: 0,
    totalSkipped: 0,
    totalErrors: 0,
  };

  const collectionsToProcess = COLLECTIONS.filter((c) => c.enabled);

  for (const collection of collectionsToProcess) {
    const result = await processCollection(collection);
    stats.totalProcessed += result.processed;
    stats.totalSkipped += result.skipped;
    stats.totalErrors += result.errors;
  }

  // Final summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 PIPELINE SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total documents processed:  ${stats.totalProcessed}`);
  console.log(`Total documents skipped:    ${stats.totalSkipped}`);
  console.log(`Total errors:               ${stats.totalErrors}`);

  // Current database stats
  const finalCount = ((await db.query('SELECT COUNT(*) as count FROM documents')).rows[0] ??
    null) as {
    count: number;
  };
  console.log(`\nFinal database count:       ${finalCount.count} documents`);

  // End Pipeline Run
  await PipelineService.updateRunStatus(currentRun.id, 'succeeded');

  if (stats.totalProcessed > 0) {
    await db.query('ANALYZE documents');
    await db.query('ANALYZE entities');
    markViewsDirty();
  }

  // Collection breakdown
  console.log('\nBy Collection:');
  const collections = (
    await db.query(
      'SELECT source_collection, COUNT(*) as count FROM documents GROUP BY source_collection ORDER BY count DESC',
    )
  ).rows as any[];
  for (const coll of collections) {
    console.log(`  • ${coll.source_collection}: ${coll.count}`);
  }

  console.log('='.repeat(80));
  console.log('✅ Ingestion complete! Now starting Intelligence Pipeline...');

  // Phase 2: Process from Queue (Reprocessing Lane)
  await processQueue();
}

/**
 * AI enrichment backfill: generates summaries and cleans OCR text for all
 * completed documents that are missing ai_summary. Runs outside the job-lease
 * system — it queries directly and updates in place without touching
 * processing_status, so it's safe to run alongside a live queue processor.
 */
async function enrichCompleted() {
  const db = getIngestPool();
  // Exo serves ~1 request at a time; 3-4 concurrent keeps the pipeline fed
  // without building a queue (30 concurrent = 30x latency penalty).
  const CONCURRENCY = 4;
  const BATCH = 300;

  // Count total work
  const { rows: countRows } = await db.query(`
    SELECT COUNT(*) AS n FROM documents
    WHERE processing_status = 'completed'
      AND content IS NOT NULL
      AND length(content) >= 100
      AND (metadata_json->>'ai_summary') IS NULL
  `);
  const total = parseInt(countRows[0].n, 10);
  console.log(`   📊 ${total.toLocaleString()} docs need enrichment (no ai_summary yet)`);
  if (total === 0) {
    console.log('   ✅ Already fully enriched.');
    return;
  }

  let processed = 0;
  let lastId = 0;

  // Backfill: summaries only — OCR cleaning runs at ingest time for new docs.
  // Skipping cleanOCRText here reduces LLM calls from ~6 to 1 per doc.
  const processRow = async (row: { id: number; file_path: string | null; content: string }) => {
    try {
      const text = row.content;
      const summary = await AIEnrichmentService.summarizeDocument(text, {
        fileName: row.file_path ? path.basename(row.file_path) : undefined,
      });
      if (summary && summary.length > 0) {
        await db.query(
          `UPDATE documents
           SET metadata_json      = COALESCE(metadata_json, '{}'::jsonb) || jsonb_build_object('ai_summary', $1::text),
               last_processed_at  = NOW()
           WHERE id = $2`,
          [summary, row.id],
        );
      }
    } catch (e) {
      // Non-fatal — skip silently, will be retried on next run
    }
  };

  while (true) {
    const { rows } = await db.query(
      `
      SELECT id, file_path, content FROM documents
      WHERE processing_status = 'completed'
        AND content IS NOT NULL
        AND length(content) >= 100
        AND (metadata_json->>'ai_summary') IS NULL
        AND id > $1
      ORDER BY id
      LIMIT $2
    `,
      [lastId, BATCH],
    );
    if (rows.length === 0) break;

    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const chunk = rows.slice(i, i + CONCURRENCY);
      await Promise.allSettled(chunk.map((row: any) => processRow(row)));
      processed += chunk.length;
      if (processed % 100 === 0 || processed === total) {
        const pct = ((processed / total) * 100).toFixed(1);
        process.stdout.write(
          `\r   🧠 Enriched ${processed.toLocaleString()} / ${total.toLocaleString()} (${pct}%)`,
        );
      }
    }

    lastId = rows[rows.length - 1].id as number;
  }

  process.stdout.write(
    `\n   ✅ Enrichment complete — ${processed.toLocaleString()} docs processed.\n`,
  );
}

/**
 * OCR cleaning backfill: cleans text for completed docs missing content_refined.
 * Run after enrichCompleted() so summaries are already in place.
 */
async function ocrCleanCompleted() {
  const db = getIngestPool();
  const CONCURRENCY = 8; // Lower than summaries — each doc spawns up to 5 chunk calls

  const { rows: countRows } = await db.query(`
    SELECT COUNT(*) AS n FROM documents
    WHERE processing_status = 'completed'
      AND content IS NOT NULL
      AND length(content) >= 100
      AND content_refined IS NULL
  `);
  const total = parseInt(countRows[0].n, 10);
  console.log(`   📊 ${total.toLocaleString()} docs need OCR cleaning`);
  if (total === 0) {
    console.log('   ✅ Already fully cleaned.');
    return;
  }

  let processed = 0;
  let lastId = 0;
  const BATCH = 100;

  while (true) {
    const { rows } = await db.query(
      `SELECT id, file_path, content FROM documents
       WHERE processing_status = 'completed'
         AND content IS NOT NULL
         AND length(content) >= 100
         AND content_refined IS NULL
         AND id > $1
       ORDER BY id LIMIT $2`,
      [lastId, BATCH],
    );
    if (rows.length === 0) break;

    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const chunk = rows.slice(i, i + CONCURRENCY);
      await Promise.allSettled(
        chunk.map(async (row: any) => {
          try {
            const cleaned = await AIEnrichmentService.cleanOCRText(row.content as string);
            if (cleaned && cleaned !== row.content) {
              await db.query(
                `UPDATE documents
                 SET content_refined   = $1,
                     last_processed_at = NOW()
                 WHERE id = $2`,
                [cleaned, row.id],
              );
            }
          } catch {
            /* non-fatal */
          }
        }),
      );
      processed += chunk.length;
      if (processed % 50 === 0 || processed === total) {
        const pct = ((processed / total) * 100).toFixed(1);
        process.stdout.write(
          `\r   🔧 Cleaned ${processed.toLocaleString()} / ${total.toLocaleString()} (${pct}%)`,
        );
      }
    }

    lastId = rows[rows.length - 1].id as number;
  }

  process.stdout.write(
    `\n   ✅ OCR cleaning complete — ${processed.toLocaleString()} docs processed.\n`,
  );
}

async function processQueue() {
  const jobManager = new JobManager();
  console.log('\nProcessing Queue with Robust Leasing (Phase 9)...');

  // Enforce Exo cluster usage
  process.env.AI_PROVIDER = 'exo_cluster';
  process.env.ENABLE_AI_ENRICHMENT = 'true';
  console.log('   🚀 Enforcing AI_PROVIDER=exo_cluster for maximum throughput');

  const CONCURRENCY = parseInt(process.env.INGEST_CONCURRENCY || '30', 10);
  const activePromises: Set<Promise<void>> = new Set();
  let processedCount = 0;
  let hasMore = true;

  // These are the large in-progress sets we want to save for last.
  const GIANT_COLLECTIONS = ['DOJ Data Set 9', 'DOJ Data Set 10', 'DOJ Data Set 11'];

  // Permanent failure signatures — never retry these regardless of collection.
  const PERMANENT_ERROR_FILTER = `
    processing_error IS NULL
    OR (
      processing_error NOT ILIKE '%corrupt%'
      AND processing_error NOT ILIKE '%encrypt%'
      AND processing_error NOT ILIKE '%password%'
      AND processing_error NOT ILIKE '%invalid pdf%'
    )
  `;

  // Non-giant collections: re-queue ALL retryable failures regardless of
  // attempt count — "database is locked" and similar transient errors must
  // not leave a tranche permanently stuck below 100%.
  const requeuedMopUp = await db.query(
    `
    UPDATE documents
    SET processing_status = 'queued',
        worker_id         = NULL,
        lease_expires_at  = NULL,
        processing_error  = NULL
    WHERE processing_status = 'failed'
      AND source_collection != ALL($1)
      AND (${PERMANENT_ERROR_FILTER})
  `,
    [GIANT_COLLECTIONS],
  );

  // Giant collections: only re-queue docs that haven't exhausted retries
  // (we'll get to them eventually, no need to hammer them).
  const requeuedGiants = await db.query(
    `
    UPDATE documents
    SET processing_status = 'queued',
        worker_id         = NULL,
        lease_expires_at  = NULL,
        processing_error  = NULL
    WHERE processing_status = 'failed'
      AND source_collection = ANY($1)
      AND (processing_attempts IS NULL OR processing_attempts < 5)
      AND (${PERMANENT_ERROR_FILTER})
  `,
    [GIANT_COLLECTIONS],
  );

  console.log(
    `   ♻️  Re-queued ${requeuedMopUp.rowCount ?? 0} mop-up docs (non-giant) + ${requeuedGiants.rowCount ?? 0} giant-collection docs.`,
  );

  // Pre-compute collection priority: collections closest to 100% go first so
  // tranches complete fully rather than all advancing in parallel.
  const priorityRows = (
    await db.query<{ source_collection: string; pct_done: string; remaining: string }>(`
      SELECT
        source_collection,
        ROUND(
          COUNT(*) FILTER (WHERE processing_status IN ('succeeded','completed')) * 100.0 / COUNT(*),
          1
        ) AS pct_done,
        COUNT(*) FILTER (WHERE processing_status = 'queued') AS remaining
      FROM documents
      WHERE source_collection IS NOT NULL
        AND processing_status IN ('queued','succeeded','completed','processing','failed')
      GROUP BY source_collection
      HAVING COUNT(*) FILTER (WHERE processing_status = 'queued') > 0
      ORDER BY pct_done DESC
    `)
  ).rows;
  // These large datasets are deprioritized — all other collections drain to
  // 100% first. DS 9 joins DS 10/11 so near-complete tranches finish before
  // the big multi-day sets get any slots.
  const DEPRIORITIZED = new Set(['DOJ Data Set 9', 'DOJ Data Set 10', 'DOJ Data Set 11']);

  const normal = priorityRows.filter((r) => !DEPRIORITIZED.has(r.source_collection));
  const deprio = priorityRows.filter((r) => DEPRIORITIZED.has(r.source_collection));
  // Within deprioritized, still process the further-along one first
  deprio.sort((a, b) => parseFloat(b.pct_done) - parseFloat(a.pct_done));

  const collectionPriority = [...normal, ...deprio].map((r) => r.source_collection);
  console.log('   📊 Collection priority (closest to done first; large sets deprioritized):');
  [...normal, ...deprio].forEach((r) =>
    console.log(
      `      ${DEPRIORITIZED.has(r.source_collection) ? '[deprio] ' : '         '}${r.source_collection}: ${r.pct_done}% done, ${r.remaining} remaining`,
    ),
  );

  console.log(`   ⚡️  Concurrency Level: ${CONCURRENCY} workers`);

  // Track per-collection remaining counts so we can celebrate completions.
  const collectionRemaining = new Map<string, number>();
  for (const row of [...normal, ...deprio]) {
    collectionRemaining.set(row.source_collection, parseInt(row.remaining, 10));
  }

  const launchDoc = (doc: {
    id: number;
    file_path: string;
    source_collection: string | null;
    processing_attempts: number;
  }) => {
    const promise = (async () => {
      const docId = Math.floor(doc.id);
      try {
        await jobManager.renewLease(docId, 600);

        const fullDoc =
          (await db.query('SELECT content, content_preview FROM documents WHERE id = $1', [docId]))
            .rows[0] ?? null;

        if (fullDoc && fullDoc.content) {
          const context = fullDoc.content.slice(0, 2000);
          const repaired = await AIEnrichmentService.repairMimeWildcards(fullDoc.content, context);

          // Run OCR cleaning and summary generation in parallel on the repaired text
          const [cleaned, summary] = await Promise.all([
            AIEnrichmentService.cleanOCRText(repaired),
            AIEnrichmentService.summarizeDocument(repaired, {
              fileName: doc.file_path ? path.basename(doc.file_path) : undefined,
            }),
          ]);

          const refined = cleaned || repaired;
          const contentChanged = refined !== fullDoc.content;
          const hasSummary = summary && summary.length > 0;

          if (contentChanged || hasSummary) {
            await db.query(
              `UPDATE documents
               SET content           = CASE WHEN $1 THEN $2 ELSE content END,
                   content_refined   = CASE WHEN $1 THEN $3 ELSE content_refined END,
                   metadata_json     = CASE WHEN $4 THEN
                                         COALESCE(metadata_json, '{}'::jsonb) || jsonb_build_object('ai_summary', $5::text)
                                       ELSE metadata_json END,
                   last_processed_at = NOW()
               WHERE id = $6`,
              [contentChanged, refined, refined, hasSummary, summary, docId],
            );
          }
        }

        await jobManager.completeJob(docId);
        processedCount++;

        // Celebrate when a collection drains to zero.
        if (doc.source_collection) {
          const prev = collectionRemaining.get(doc.source_collection) ?? 1;
          const next = Math.max(0, prev - 1);
          collectionRemaining.set(doc.source_collection, next);
          if (next === 0) {
            process.stdout.write(`\n   🎉 ${doc.source_collection} — 100% COMPLETE\n`);
          }
        }

        if (processedCount % 10 === 0) {
          process.stdout.write(
            `\r   ✅ Processed ${processedCount} documents (Active: ${activePromises.size})`,
          );
        }
      } catch (e) {
        console.error(`\n      ❌ Job Failed (Doc ${docId}): ${(e as Error).message}`);
        await jobManager.failJob(docId, (e as Error).message);
      }
    })();

    promise.finally(() => activePromises.delete(promise));
    activePromises.add(promise);
  };

  while (hasMore || activePromises.size > 0) {
    // Batch-fill all open slots in one DB round-trip so every AI call fires
    // simultaneously instead of serialising behind individual acquires.
    const slots = CONCURRENCY - activePromises.size;
    if (slots > 0 && hasMore) {
      const batch = await jobManager.acquireJobBatch(slots, 600, collectionPriority);
      if (batch.length === 0) {
        hasMore = false;
      } else {
        for (const doc of batch) {
          launchDoc(doc);
        }
      }
    }

    if (activePromises.size > 0) {
      await Promise.race(activePromises);
    } else if (!hasMore) {
      break;
    }
  }

  if (processedCount === 0) {
    console.log('\n   (No queued jobs found)');
  } else {
    await db.query('ANALYZE documents');
    markViewsDirty();
    console.log(`\n\n   ✅ Processed ${processedCount} queued jobs reliably.`);
  }
}

// Run the pipeline
import { pathToFileURL } from 'url';
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}
