// ============================================================================
// AI ARTIFACTS — sentences, granular page data, watermarking
// ============================================================================

import { extname, basename } from 'path';
import * as path from 'path';
import * as fs from 'fs';
import { mkdirSync } from 'fs';
import * as crypto from 'crypto';
import sharp from 'sharp';
import { discoveryRepository } from '../../src/server/db/discoveryRepository.js';
import { AssetService } from '../../src/server/services/assetService.js';
import { detectMimeType } from './mime.js';
import { generatePhash, generatePagePhash } from './provenance.js';
import type { IngestContext } from './context.js';

/**
 * Split text into sentences and store them.
 */
export async function storeSentences(
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

export async function storeGranularData(
  documentId: number,
  content: string,
  mimeType: string,
  ext: string,
  pages: any[] | undefined,
  filePath: string,
  ctx: IngestContext,
) {
  if ((ext === '.pdf' || mimeType === 'application/pdf') && pages && pages.length > 0) {
    for (const page of pages) {
      const ocrScore = calculateOcrScore(page.text);

      // Generate pHash for this page
      // page.pageNumber is 1-indexed, sharp uses 0-indexed
      const phash = await generatePagePhash(
        filePath,
        page.pageNumber - 1,
        ctx.audit.recordError.bind(ctx.audit),
      );

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
      phash = await generatePhash(filePath, ctx.audit.recordError.bind(ctx.audit));
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

/**
 * Calculate a quality score for OCR text (0.0 to 1.0).
 * Based on basic word-to-garbage ratio.
 */
export function calculateOcrScore(text: string): number {
  if (!text || text.length < 50) return 0;
  const words = text.match(/\b[a-zA-Z]{2,}\b/g) || [];
  const totalTokens = text.match(/\S+/g) || [];
  if (totalTokens.length === 0) return 0;

  // Ratio of "real words" to total tokens
  const score = words.length / totalTokens.length;
  return Math.min(score * 1.2, 1.0); // Slight boost for common short words not caught by regex
}

export async function applyWatermark(
  filePath: string,
  collectionName: string,
  originalAssetId: number,
  _ctx: IngestContext,
): Promise<{ derivativePath: string; sha256: string; assetId: number } | null> {
  // Only target specific collections
  if (collectionName !== 'Confirmed Fake' && collectionName !== 'Unconfirmed Claims') return null;

  // Only verify images
  const ext = extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return null;

  const filename = basename(filePath);
  const derivativeDir = path.join(process.cwd(), 'data/derivatives/watermarked');
  const derivativePath = path.join(derivativeDir, filename);

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
