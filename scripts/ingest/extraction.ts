// ============================================================================
// TEXT EXTRACTION — PDF, image, RTF, media, archive, email
// ============================================================================

import { join, basename } from 'path';
import * as path from 'path';
import { readFileSync, existsSync, mkdtempSync } from 'fs';
import * as fs from 'fs';
import { tmpdir } from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Shim DOMMatrix for Node environments missing it (e.g. Node 20.9.0)
// Must happen before requiring pdf-parse
if (typeof globalThis.DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    constructor() {}
  };
}

const pdfParseModule = require('pdf-parse');
const PDFParse = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse || pdfParseModule;

import * as crypto from 'crypto';
import { execFile } from 'child_process';
import { createWorker } from 'tesseract.js';
import { simpleParser } from 'mailparser';
import { convert } from 'html-to-text';
import AdmZip from 'adm-zip';
import { RedactionResolver } from '../../src/server/services/RedactionResolver.js';
import { TextCleaner } from '../utils/text_cleaner.js';
import { AIEnrichmentService } from '../../src/server/services/AIEnrichmentService.js';
import type { EmailMetadata } from './types.js';

export const FFMPEG_BIN = '/usr/local/bin/ffmpeg';
export const WHISPER_BIN = '/usr/local/bin/whisper';
// Whisper model to use for transcription. 'base' balances speed and accuracy
// well for phone-quality recordings common in surveillance/legal evidence.
// Upgrade to 'medium' or 'large' for cleaner studio audio.
export const WHISPER_MODEL = process.env.WHISPER_MODEL || 'base';
// Hard ceiling per file so a 3-hour video doesn't monopolise the pipeline
export const WHISPER_TIMEOUT_MS = parseInt(
  process.env.WHISPER_TIMEOUT_MS || String(30 * 60 * 1000),
  10,
);

export async function extractTextFromPdf(buffer: Buffer): Promise<{
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

export async function extractTextFromImage(
  filePath: string,
): Promise<{ text: string; pageCount: number; vlm_parsed?: boolean }> {
  try {
    let vlm_parsed = false;
    let text = '';
    if (process.env.ENABLE_AI_ENRICHMENT === 'true') {
      try {
        const buffer = readFileSync(filePath);
        text = await AIEnrichmentService.parseDocumentPageVisual(buffer);
        if (text) {
          vlm_parsed = true;
          console.log(`   🧠 Image parsed via VLM Vision Engine (${text.length} chars)`);
        }
      } catch (err) {
        console.warn(
          '  ⚠️  VLM Image parsing failed, falling back to Tesseract:',
          (err as Error).message,
        );
      }
    }

    if (!text) {
      const worker = await createWorker('eng');
      const {
        data: { text: ocrText },
      } = await worker.recognize(filePath);
      text = ocrText;
      await worker.terminate();
    }

    return {
      text: text || '',
      pageCount: 1,
      vlm_parsed,
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
export function stripRtf(rtf: string): string {
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
      0x91: '‘',
      0x92: '’',
      0x93: '“',
      0x94: '”',
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
export async function ocrFallbackForPdf(
  pdfPath: string,
  pageCount: number,
): Promise<{
  text: string;
  pages: { text: string; pageNumber: number; source: 'ocr' }[];
  vlm_parsed?: boolean;
}> {
  const pages: { text: string; pageNumber: number; source: 'ocr' }[] = [];
  let worker: any = null;
  let vlm_parsed_any = false;

  try {
    for (let i = 0; i < pageCount; i++) {
      try {
        const pageNum = i + 1;
        const imageBuffer = await new Promise<Buffer>((resolve, reject) => {
          execFile(
            'pdftoppm',
            ['-png', '-r', '300', '-f', `${pageNum}`, '-l', `${pageNum}`, pdfPath],
            { encoding: 'buffer', maxBuffer: 50 * 1024 * 1024 },
            (err, stdout) => {
              if (err) reject(err);
              else resolve(stdout);
            },
          );
        });

        let pageText = '';

        // Try high-fidelity VLM parser first
        if (process.env.ENABLE_AI_ENRICHMENT === 'true') {
          try {
            pageText = await AIEnrichmentService.parseDocumentPageVisual(imageBuffer);
            if (pageText) {
              vlm_parsed_any = true;
              console.log(`   🧠 Page ${pageNum} parsed via VLM (${pageText.length} chars)`);
            }
          } catch (_err) {
            console.warn(`  ⚠️ VLM parse failed on page ${pageNum}, trying Tesseract...`);
          }
        }

        // Fallback to Tesseract if VLM is disabled or produced no content
        if (!pageText) {
          if (!worker) worker = await createWorker('eng');
          const {
            data: { text },
          } = await worker.recognize(imageBuffer);
          pageText = text.trim();
        }

        pages.push({ text: pageText, pageNumber: pageNum, source: 'ocr' });
      } catch (pageErr) {
        console.warn(`  ⚠️  Image analysis failed on page ${i + 1}:`, (pageErr as Error).message);
        pages.push({ text: '', pageNumber: i + 1, source: 'ocr' });
      }
    }
  } finally {
    if (worker) await worker.terminate();
  }

  return {
    text: pages.map((p) => p.text).join('\n\n'),
    pages,
    vlm_parsed: vlm_parsed_any,
  };
}

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
export async function transcribeMedia(
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

export async function processArchive(filePath: string): Promise<{
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
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (err.message && err.message.includes('encrypted')) {
      return { members: [], isEncrypted: true };
    }
    throw error;
  }
}

export async function processEmail(
  filePath: string,
  auditRecordError: (type: string, message: string) => void,
): Promise<{
  content: string;
  metadata: EmailMetadata;
  date?: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
  emailSha256?: string;
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
      } catch (_e) {
        auditRecordError('email_metadata_parse', (_e as Error).message);
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
      if (Array.isArray(addr)) return addr.map((a: any) => a.text).join(', ');
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

    // Extract attachments for later processing
    const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [];
    if (parsed.attachments && Array.isArray(parsed.attachments)) {
      for (const att of parsed.attachments) {
        if (att.content && typeof att.filename === 'string') {
          attachments.push({
            filename: att.filename,
            content: Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content),
            contentType: att.contentType || 'application/octet-stream',
          });
        }
      }
    }

    // Apply Redaction Resolver
    const resolution = RedactionResolver.resolve(cleanText, {
      sender: metadata.from,
      receiver: metadata.to,
      subject: metadata.subject,
      date: metadata.date,
    });

    // Compute email SHA256 for attachment directory organization
    const emailSha256 = crypto.createHash('sha256').update(rawContent).digest('hex');

    return {
      content: resolution.resolvedText,
      metadata,
      date: metadata.date,
      attachments,
      emailSha256,
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
