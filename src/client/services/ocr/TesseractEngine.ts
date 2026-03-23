import { createWorker } from 'tesseract.js';
import { OCREngine, OCRResult } from './types.js';
export class TesseractEngine implements OCREngine {
  name = 'Tesseract.js (LSTM)';

  supports(mimeType: string): boolean {
    return [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/bmp',
      'image/webp',
      // Tesseract can handle PDFs if converted to images, but for now let's stick to images
      // Actually, tesseract.js is mainly for images.
    ].includes(mimeType);
  }

  async process(filePath: string): Promise<OCRResult> {
    const start = Date.now();
    let worker = null;

    try {
      worker = await createWorker('eng');

      const result = await worker.recognize(filePath);
      const text = result.data.text;
      const confidence = result.data.confidence;

      await worker.terminate();

      return {
        text,
        confidence,
        engine: this.name,
        durationMs: Date.now() - start,
        metadata: {
          orientation_confidence: (result.data as unknown as Record<string, unknown>)
            .orientation_confidence,
          orientation_degrees: (result.data as unknown as Record<string, unknown>)
            .orientation_degrees,
        },
      };
    } catch (error) {
      if (worker) {
        await worker.terminate();
      }
      throw error;
    }
  }
}
