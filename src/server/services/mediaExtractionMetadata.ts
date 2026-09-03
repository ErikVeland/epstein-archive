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
  method:
    | 'pixel-statistics-v1'
    | 'pixel-statistics-v2'
    | 'pixel-statistics-v3'
    | 'pixel-statistics-v4';
}

export interface ExtractedVisualStats {
  width: number;
  height: number;
  entropy: number;
  channelMeans: number[];
  channelStdevs: number[];
  whitePixelRatio?: number;
  nearWhitePixelRatio?: number;
  blackPixelRatio?: number;
  colorPixelRatio?: number;
  dominantColorRatio?: number;
  edgePixelRatio?: number;
}

interface RawPixelSample {
  data: Uint8Array;
  width: number;
  height: number;
  channels: number;
  originalWidth: number;
  originalHeight: number;
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

export function calculateVisualStatsFromPixelSample(sample: RawPixelSample): ExtractedVisualStats {
  const { data, width, height, channels, originalWidth, originalHeight } = sample;
  const pixelCount = width * height;
  if (pixelCount < 1 || channels < 1 || data.length < pixelCount * channels) {
    throw new Error('Pixel sample is empty or incomplete');
  }

  const channelCount = Math.min(channels, 3);
  const channelSums = Array.from({ length: channelCount }, () => 0);
  const channelSquareSums = Array.from({ length: channelCount }, () => 0);
  const luminanceHistogram = new Uint32Array(256);
  const quantizedColors = new Uint32Array(512);
  const luminance = new Uint8Array(pixelCount);
  let whitePixels = 0;
  let nearWhitePixels = 0;
  let blackPixels = 0;
  let colorPixels = 0;

  for (let pixel = 0; pixel < pixelCount; pixel++) {
    const offset = pixel * channels;
    const red = data[offset];
    const green = channelCount > 1 ? data[offset + 1] : red;
    const blue = channelCount > 2 ? data[offset + 2] : red;
    const values = [red, green, blue];

    for (let channel = 0; channel < channelCount; channel++) {
      const value = values[channel];
      channelSums[channel] += value;
      channelSquareSums[channel] += value * value;
    }

    const luminanceValue = Math.max(
      0,
      Math.min(255, Math.round(0.2126 * red + 0.7152 * green + 0.0722 * blue)),
    );
    const colorSpread = Math.max(red, green, blue) - Math.min(red, green, blue);
    luminance[pixel] = luminanceValue;
    luminanceHistogram[luminanceValue]++;
    quantizedColors[(red >> 5) * 64 + (green >> 5) * 8 + (blue >> 5)]++;

    if (luminanceValue >= 240 && colorSpread <= 18) whitePixels++;
    if (luminanceValue >= 220 && colorSpread <= 22) nearWhitePixels++;
    if (luminanceValue <= 35) blackPixels++;
    if (colorSpread >= 20) colorPixels++;
  }

  let entropy = 0;
  for (const count of luminanceHistogram) {
    if (count === 0) continue;
    const probability = count / pixelCount;
    entropy -= probability * Math.log2(probability);
  }

  let edgeCount = 0;
  let edgeComparisons = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      if (x > 0) {
        if (Math.abs(luminance[pixel] - luminance[pixel - 1]) > 30) edgeCount++;
        edgeComparisons++;
      }
      if (y > 0) {
        if (Math.abs(luminance[pixel] - luminance[pixel - width]) > 30) edgeCount++;
        edgeComparisons++;
      }
    }
  }

  const channelMeans = channelSums.map((sum) => sum / pixelCount);
  const channelStdevs = channelSquareSums.map((squareSum, index) => {
    const variance = squareSum / pixelCount - channelMeans[index] ** 2;
    return Math.sqrt(Math.max(0, variance));
  });

  return {
    width: originalWidth,
    height: originalHeight,
    entropy,
    channelMeans,
    channelStdevs,
    whitePixelRatio: whitePixels / pixelCount,
    nearWhitePixelRatio: nearWhitePixels / pixelCount,
    blackPixelRatio: blackPixels / pixelCount,
    colorPixelRatio: colorPixels / pixelCount,
    dominantColorRatio: Math.max(...quantizedColors) / pixelCount,
    edgePixelRatio: edgeComparisons > 0 ? edgeCount / edgeComparisons : 0,
  };
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

  const hasPageMetrics =
    stats.nearWhitePixelRatio != null &&
    stats.blackPixelRatio != null &&
    stats.dominantColorRatio != null &&
    stats.edgePixelRatio != null;

  if (hasPageMetrics) {
    const nearWhitePixelRatio = stats.nearWhitePixelRatio ?? 0;
    const blackPixelRatio = stats.blackPixelRatio ?? 0;
    const dominantColorRatio = stats.dominantColorRatio ?? 0;
    const edgePixelRatio = stats.edgePixelRatio ?? 0;
    const likelyDocumentPage =
      pageShaped &&
      (nearWhitePixelRatio >= 0.45 ||
        blackPixelRatio >= 0.68 ||
        dominantColorRatio >= 0.42 ||
        (stats.entropy < 5.55 && dominantColorRatio >= 0.28) ||
        (edgePixelRatio >= 0.12 && (nearWhitePixelRatio >= 0.32 || dominantColorRatio >= 0.28)));

    if (likelyDocumentPage) {
      return {
        type: 'document_scan',
        confidence: nearWhitePixelRatio >= 0.58 || dominantColorRatio >= 0.55 ? 0.94 : 0.84,
        hasText: true,
        method: 'pixel-statistics-v4',
      };
    }

    if (area < 90_000 || shortEdge < 180) {
      return { type: 'graphic', confidence: 0.9, hasText: false, method: 'pixel-statistics-v4' };
    }

    const likelyGraphic =
      (aspectRatio >= 0.9 && dominantColorRatio >= 0.28 && stats.entropy < 6.5) ||
      (edgePixelRatio >= 0.24 &&
        ((stats.nearWhitePixelRatio ?? 0) >= 0.15 || dominantColorRatio >= 0.2));

    if (likelyGraphic) {
      return { type: 'graphic', confidence: 0.86, hasText: false, method: 'pixel-statistics-v4' };
    }

    const probablePhoto =
      stats.entropy >= 6.1 &&
      averageStdev >= 34 &&
      nearWhitePixelRatio < 0.45 &&
      blackPixelRatio < 0.68 &&
      dominantColorRatio < 0.36;

    if (probablePhoto) {
      return {
        type: 'probable_photograph',
        confidence: stats.entropy >= 6.8 && dominantColorRatio < 0.24 ? 0.9 : 0.76,
        hasText: false,
        method: 'pixel-statistics-v4',
      };
    }

    return { type: 'unknown', confidence: 0.5, hasText: false, method: 'pixel-statistics-v4' };
  }

  if (area < 90_000 || shortEdge < 180) {
    return { type: 'graphic', confidence: 0.9, hasText: false, method: 'pixel-statistics-v4' };
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
