import { describe, expect, it } from 'vitest';
import {
  calculateVisualStatsFromPixelSample,
  classifyExtractedVisual,
  outputNumberFromExtractedFilename,
  parsePdfImagesList,
} from '../server/services/mediaExtractionMetadata';

describe('PDF media extraction metadata', () => {
  it('maps Poppler output numbers to exact pages and PDF objects', () => {
    const manifest = parsePdfImagesList(`
page   num  type   width height color comp bpc  enc interp  object ID x-ppi y-ppi size ratio
--------------------------------------------------------------------------------------------
   1     0 image     769  1152  index   1   8  image  no         8  0    96    96  487K  56%
   3     1 image     640   480  rgb     3   8  jpeg   no        42  2   150   150  120K  19%
`);

    expect(manifest.get(0)).toMatchObject({
      page: 1,
      outputNumber: 0,
      objectNumber: 8,
      objectGeneration: 0,
    });
    expect(manifest.get(1)).toMatchObject({ page: 3, objectNumber: 42, objectGeneration: 2 });
  });

  it('reads the Poppler output number from extracted filenames', () => {
    expect(outputNumberFromExtractedFilename('img-000.jpg')).toBe(0);
    expect(outputNumberFromExtractedFilename('img-142.png')).toBe(142);
    expect(outputNumberFromExtractedFilename('notes.txt')).toBeNull();
  });

  it('separates probable photographs from page scans conservatively', () => {
    expect(
      classifyExtractedVisual({
        width: 1600,
        height: 1100,
        entropy: 7.4,
        channelMeans: [122, 91, 68],
        channelStdevs: [58, 51, 47],
      }),
    ).toMatchObject({ type: 'probable_photograph', hasText: false });

    expect(
      classifyExtractedVisual({
        width: 1275,
        height: 1650,
        entropy: 5.9,
        channelMeans: [231, 230, 231],
        channelStdevs: [28, 27, 28],
      }),
    ).toMatchObject({ type: 'document_scan', hasText: true });
  });

  it('rejects colored forms and black redaction pages without rejecting photographs', () => {
    const base = {
      width: 816,
      height: 1056,
      channelMeans: [120, 120, 120],
      colorPixelRatio: 0.5,
      whitePixelRatio: 0.02,
      edgePixelRatio: 0.1,
    };

    expect(
      classifyExtractedVisual({
        ...base,
        entropy: 4.82,
        channelStdevs: [47, 47, 47],
        nearWhitePixelRatio: 0.02,
        blackPixelRatio: 0.02,
        dominantColorRatio: 0.61,
      }),
    ).toMatchObject({ type: 'document_scan', method: 'pixel-statistics-v4' });

    expect(
      classifyExtractedVisual({
        ...base,
        entropy: 1.44,
        channelStdevs: [61, 61, 61],
        nearWhitePixelRatio: 0.05,
        blackPixelRatio: 0.93,
        dominantColorRatio: 0.93,
      }),
    ).toMatchObject({ type: 'document_scan' });

    expect(
      classifyExtractedVisual({
        ...base,
        width: 769,
        height: 1152,
        entropy: 7.46,
        channelStdevs: [59, 59, 59],
        nearWhitePixelRatio: 0.02,
        blackPixelRatio: 0.14,
        dominantColorRatio: 0.15,
      }),
    ).toMatchObject({ type: 'probable_photograph' });

    expect(
      classifyExtractedVisual({
        ...base,
        width: 409,
        height: 408,
        entropy: 6.86,
        channelStdevs: [94, 87, 84],
        nearWhitePixelRatio: 0.24,
        blackPixelRatio: 0.09,
        dominantColorRatio: 0.23,
        edgePixelRatio: 0.29,
      }),
    ).toMatchObject({ type: 'graphic' });

    expect(
      classifyExtractedVisual({
        ...base,
        width: 150,
        height: 200,
        entropy: 5.1,
        channelStdevs: [31, 31, 31],
        nearWhitePixelRatio: 0.82,
        blackPixelRatio: 0.03,
        dominantColorRatio: 0.67,
        edgePixelRatio: 0.14,
      }),
    ).toMatchObject({ type: 'document_scan' });
  });

  it('derives stable page metrics from a raw RGB sample', () => {
    const stats = calculateVisualStatsFromPixelSample({
      data: Uint8Array.from([255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0]),
      width: 2,
      height: 2,
      channels: 3,
      originalWidth: 1200,
      originalHeight: 1600,
    });

    expect(stats.whitePixelRatio).toBe(0.5);
    expect(stats.blackPixelRatio).toBe(0.5);
    expect(stats.width).toBe(1200);
    expect(stats.height).toBe(1600);
  });
});
