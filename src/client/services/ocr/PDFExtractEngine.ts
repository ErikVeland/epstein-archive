import fs from 'fs';
// @ts-ignore - pdf-parse has typing issues
import { PDFParse } from 'pdf-parse';
import { OCREngine, OCRResult } from './types.js';

export class PDFExtractEngine implements OCREngine {
  name = 'PDF Text Extraction (Native)';

  supports(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  async process(filePath: string): Promise<OCRResult> {
    const start = Date.now();
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: dataBuffer });
      const textData = await parser.getText();
      const infoData = await parser.getInfo();

      const text = textData.text;

      // Heuristic confidence:
      // If text is very short but PDF has many pages, confidence is low (likely scanned images)
      // If text density is high, confidence is high.
      const pageCount = textData.total;
      const charCount = text.length;

      // Arbitrary heuristic: < 50 chars per page suggests it might be a scan with no text layer
      const charsPerPage = pageCount > 0 ? charCount / pageCount : 0;
      let confidence = 95; // Default high for native extraction

      if (charsPerPage < 50) {
        confidence = 10; // Very low confidence, probably just headers/footers or empty
      } else if (charsPerPage < 200) {
        confidence = 50; // Medium
      }

      return {
        text,
        confidence,
        engine: this.name,
        durationMs: Date.now() - start,
        metadata: {
          pages: pageCount,
          info: infoData.info,
          version: (infoData as unknown as Record<string, unknown>).version || '1.0', // version is not directly available in new API
        },
      };
    } catch (error) {
      // Return error result or throw?
      // For competition, throwing is fine, the manager catches it.
      throw new Error(`PDF Extract failed: ${error}`);
    }
  }
}
