export interface PdfImageObject {
  outputNumber: number;
  page: number;
  objectNumber: number;
  objectGeneration: number;
  width: number;
  height: number;
  type: string;
}

export type ExtractedVisualType = 'probable_photograph' | 'document_scan' | 'graphic' | 'unknown';

export interface ExtractedVisualClassification {
  type: ExtractedVisualType;
  confidence: number;
  hasText: boolean;
  method: 'pixel-statistics-v1';
}

export interface ExtractedVisualStats {
  width: number;
  height: number;
  entropy: number;
  channelMeans: number[];
  channelStdevs: number[];
}

const PDF_IMAGE_ROW = /^\s*\d+\s+\d+\s+(?:image|mask|smask)\s+/i;

export function parsePdfImagesList(output: string): Map<number, PdfImageObject> {
  const images = new Map<number, PdfImageObject>();

  for (const line of output.split(/\r?\n/)) {
    if (!PDF_IMAGE_ROW.test(line)) continue;
    const columns = line.trim().split(/\s+/);
    if (columns.length < 12) continue;

    const page = Number.parseInt(columns[0], 10);
    const outputNumber = Number.parseInt(columns[1], 10);
    const width = Number.parseInt(columns[3], 10);
    const height = Number.parseInt(columns[4], 10);
    const objectNumber = Number.parseInt(columns[10], 10);
    const objectGeneration = Number.parseInt(columns[11], 10);

    if (
      !Number.isInteger(page) ||
      !Number.isInteger(outputNumber) ||
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      !Number.isInteger(objectNumber) ||
      !Number.isInteger(objectGeneration)
    ) {
      continue;
    }

    images.set(outputNumber, {
      outputNumber,
      page,
      objectNumber,
      objectGeneration,
      width,
      height,
      type: columns[2].toLowerCase(),
    });
  }

  return images;
}

export function outputNumberFromExtractedFilename(filename: string): number | null {
  const match = filename.match(/-(\d+)(?:\.[^.]+)$/);
  if (!match) return null;
  const outputNumber = Number.parseInt(match[1], 10);
  return Number.isInteger(outputNumber) ? outputNumber : null;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function range(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values) - Math.min(...values);
}

export function classifyExtractedVisual(
  stats: ExtractedVisualStats,
): ExtractedVisualClassification {
  const area = stats.width * stats.height;
  const shortEdge = Math.min(stats.width, stats.height);
  const longEdge = Math.max(stats.width, stats.height);
  const aspectRatio = longEdge > 0 ? shortEdge / longEdge : 0;
  const averageStdev = average(stats.channelStdevs.slice(0, 3));
  const colorRange = range(stats.channelMeans.slice(0, 3));
  const stdevRange = range(stats.channelStdevs.slice(0, 3));
  const hasColorVariation = colorRange >= 10 || stdevRange >= 9;
  const pageShaped = aspectRatio >= 0.62 && aspectRatio <= 0.84;

  if (area < 90_000 || shortEdge < 180) {
    return { type: 'graphic', confidence: 0.9, hasText: false, method: 'pixel-statistics-v1' };
  }

  const strongPhotoSignal =
    stats.entropy >= 7.05 && averageStdev >= 40 && (hasColorVariation || averageStdev >= 48);
  const moderatePhotoSignal =
    stats.entropy >= 6.75 && averageStdev >= 46 && hasColorVariation && area >= 250_000;

  if (strongPhotoSignal || moderatePhotoSignal) {
    const confidence = strongPhotoSignal && hasColorVariation ? 0.86 : 0.72;
    return {
      type: 'probable_photograph',
      confidence,
      hasText: false,
      method: 'pixel-statistics-v1',
    };
  }

  const scanSignal =
    pageShaped &&
    area >= 250_000 &&
    !hasColorVariation &&
    (stats.entropy < 6.85 || averageStdev < 39);

  if (scanSignal) {
    return {
      type: 'document_scan',
      confidence: 0.82,
      hasText: true,
      method: 'pixel-statistics-v1',
    };
  }

  return { type: 'unknown', confidence: 0.45, hasText: false, method: 'pixel-statistics-v1' };
}
