import { OCREngine, OCRResult } from './types.js';
import { TesseractEngine } from './TesseractEngine.js';
import { PDFExtractEngine } from './PDFExtractEngine.js';
import { ExternalManualOCREngine } from './ExternalManualOCREngine.js';
import { prettifyOCRText } from '../../utils/prettifyOCR.js';

export class CompetitiveOCRService {
  private engines: OCREngine[] = [];
  private commonWords = new Set([
    'the',
    'be',
    'to',
    'of',
    'and',
    'a',
    'in',
    'that',
    'have',
    'i',
    'it',
    'for',
    'not',
    'on',
    'with',
    'he',
    'as',
    'you',
    'do',
    'at',
  ]);

  constructor() {
    // Register available engines
    // Priority: Manual > Native PDF > Tesseract
    this.engines.push(new ExternalManualOCREngine());
    this.engines.push(new PDFExtractEngine());
    this.engines.push(new TesseractEngine());

    // Future: Add AWS Textract, Google Vision, Azure Form Recognizer here
    // this.engines.push(new AWSTextractEngine());
  }

  /**
   * Run all applicable engines and pick the winner
   */
  async process(
    filePath: string,
    mimeType: string,
    manualTextOverride?: string,
  ): Promise<OCRResult> {
    // If manual override provided, it wins immediately
    if (manualTextOverride) {
      return {
        text: manualTextOverride,
        confidence: 100,
        engine: 'Manual Override (Collection Metadata)',
        durationMs: 0,
        hasRedactions: this.analyzeRedactions(manualTextOverride).hasRedactions,
        redactionRatio: this.analyzeRedactions(manualTextOverride).redactionRatio,
      };
    }

    const applicableEngines = this.engines.filter((e) => {
      const supported = e.supports(mimeType);
      // console.log(`    Engine ${e.name} supports ${mimeType}? ${supported}`);
      return supported;
    });

    if (applicableEngines.length === 0) {
      return {
        text: '',
        confidence: 0,
        engine: 'None',
        durationMs: 0,
      };
    }

    console.log(
      `  🏁 Starting OCR Competition for ${filePath} (${applicableEngines.length} engines)`,
    );

    // Run in parallel (competing!) with timeouts
    const promises = applicableEngines.map(async (engine) => {
      try {
        // 30s timeout for each engine
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 30000),
        );

        const result = await Promise.race([engine.process(filePath), timeoutPromise]);

        return result as OCRResult;
      } catch (error) {
        console.warn(`    ⚠️ Engine ${engine.name} failed or timed out:`, error);
        return null;
      }
    });

    const results = (await Promise.all(promises)).filter((r) => r !== null) as OCRResult[];

    if (results.length === 0) {
      throw new Error('All OCR engines failed');
    }

    // Judge the winner
    const winner = this.judge(results);

    // Check for redactions in the winner
    const redactionMetrics = this.analyzeRedactions(winner.text);

    // Apply final polish/cleanup
    const cleanedText = prettifyOCRText(redactionMetrics.normalizedText);

    winner.hasRedactions = redactionMetrics.hasRedactions;
    winner.redactionRatio = redactionMetrics.redactionRatio;
    winner.text = cleanedText;

    console.log(
      `  🏆 Winner: ${winner.engine} (Confidence: ${winner.confidence.toFixed(1)}%, Length: ${winner.text.length}, Redactions: ${winner.hasRedactions}, Ratio: ${(winner.redactionRatio * 100).toFixed(2)}%)`,
    );

    // Log losers for analysis
    results
      .filter((r) => r !== winner)
      .forEach((r) => {
        const redacted = this.analyzeRedactions(r.text).hasRedactions;
        console.log(
          `    ❌ Loser: ${r.engine} (Confidence: ${r.confidence.toFixed(1)}%, Length: ${r.text.length}, Redactions: ${redacted})`,
        );
      });

    return winner;
  }

  /**
   * Analyze and normalize redactions
   */
  private analyzeRedactions(text: string): {
    hasRedactions: boolean;
    redactionRatio: number;
    normalizedText: string;
  } {
    const redactionPatterns = [
      /\[REDACTED\]/gi,
      /\[REDACTION\]/gi,
      /Exemption \d/gi,
      /b\(\d\)/gi,
      /b\(\d\)\(\w+\)/gi, // e.g., b(7)(c)
    ];

    let normalizedText = text;

    // 1. Normalize explicit markers to block characters
    // We replace [REDACTED] with 10 block chars to simulate the visual weight
    for (const pattern of redactionPatterns) {
      normalizedText = normalizedText.replace(pattern, '██████████');
    }

    // 2. Count redaction blocks (including those we just added and existing ones)
    // Block characters: █, ■, ▀, ▄, ▌, ▐, ▬
    const blockCharPattern = /[█■▀▄▌▐▬]/g;
    const matches = normalizedText.match(blockCharPattern);
    const redactionCount = matches ? matches.length : 0;
    const totalLength = normalizedText.length;

    const hasRedactions = redactionCount > 0;
    const redactionRatio = totalLength > 0 ? redactionCount / totalLength : 0;

    return { hasRedactions, redactionRatio, normalizedText };
  }

  /**
   * Decide which result is best
   */
  private judge(results: OCRResult[]): OCRResult {
    // Calculate additional quality metrics for each result
    const scoredResults = results.map((r) => {
      // 1. Word Density: What % of tokens are common English words?
      // This helps detect "high confidence gibberish" (e.g. "x8#k9!a")
      const tokens = r.text.toLowerCase().split(/[\s\n.,;!?()[\]"'-]+/);
      const validTokens = tokens.filter((t) => t.length > 1); // Ignore single chars
      const commonCount = validTokens.filter((t) => this.commonWords.has(t)).length;
      const wordDensity = validTokens.length > 0 ? commonCount / validTokens.length : 0;

      // 2. Garbage Density: What % of text is non-alphanumeric noise?
      const garbageChars = r.text.replace(/[a-zA-Z0-9\s.,!?]/g, '').length;
      const garbageRatio = r.text.length > 0 ? garbageChars / r.text.length : 1;

      // 3. Score Calculation
      // Start with base confidence
      let score = r.confidence;

      // Penalty for low word density (if text is long enough to judge)
      if (r.text.length > 50 && wordDensity < 0.1) {
        score *= 0.5; // Heavy penalty for likely gibberish
      }

      // Penalty for high garbage
      if (garbageRatio > 0.2) {
        score *= 0.7;
      }

      // Boost for Manual Engine (it's ground truth)
      if (r.engine === 'External Manual OCR' && r.text.length > 0) {
        score = 1000; // Always wins if it found something
      }

      return { result: r, score, wordDensity, garbageRatio };
    });

    // Sort by calculated score descending
    scoredResults.sort((a, b) => b.score - a.score);

    const best = scoredResults[0];

    // Log debug info if there was competition
    if (results.length > 1) {
      console.log('    ⚖️  Judgement Scores:');
      scoredResults.forEach((sr) => {
        console.log(
          `      - ${sr.result.engine}: Score ${sr.score.toFixed(1)} (Conf: ${sr.result.confidence}%, WordDens: ${(sr.wordDensity * 100).toFixed(0)}%, Garbage: ${(sr.garbageRatio * 100).toFixed(0)}%)`,
        );
      });
    }

    return best.result;
  }
}
