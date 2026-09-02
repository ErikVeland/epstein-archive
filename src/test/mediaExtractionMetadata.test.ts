import { describe, expect, it } from 'vitest';
import {
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
});
