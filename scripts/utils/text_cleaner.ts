/**
 * Text Cleaner Utility
 *
 * Provides specialized cleaning functions for:
 * 1. Email content (MIME decoding, unicode fixes, reply chain stripping)
 * 2. OCR content (fixing layout issues, removing garbage, normalizing characters)
 */

import { decode } from 'html-entities';
import quotedPrintable from 'quoted-printable';

import { AIEnrichmentService } from '../../src/server/services/AIEnrichmentService.js';

export class TextCleaner {
  /**
   * Cleans text extracted from emails (Async version for AI enrichment).
   */
  static async cleanEmailTextAsync(text: string, context?: string): Promise<string> {
    if (!text) return '';

    // Phase 1: Conventional Cleaning
    const cleaned = this.cleanEmailText(text);
    return await this.applyAiEnrichmentIfEnabled(cleaned, context);
  }

  /**
   * Cleans text extracted from OCR (Async version for AI enrichment).
   */
  static async cleanOcrTextAsync(text: string, context?: string): Promise<string> {
    if (!text) return '';

    // Phase 1: Conventional Cleaning
    const cleaned = this.cleanOcrText(text);
    return await this.applyAiEnrichmentIfEnabled(cleaned, context);
  }

  /**
   * Shared logic for applying AI enrichment if toggled on.
   */
  private static async applyAiEnrichmentIfEnabled(text: string, context?: string): Promise<string> {
    const ENABLE_AI = process.env.ENABLE_AI_ENRICHMENT === 'true';
    if (ENABLE_AI && context && text.includes('=')) {
      return await AIEnrichmentService.repairMimeWildcards(text, context);
    }
    return text;
  }

  /**
   * Cleans text extracted from emails.
   * Focuses on encoding issues, HTML entities, and common email artifacts.
   */
  static cleanEmailText(text: string): string {
    if (!text) return '';

    let cleaned = text;

    // 0. Robust Quoted-Printable Decoding
    // Often email bodies come in partially decoded or with artifacts
    if (
      cleaned.includes('=') &&
      (cleaned.includes('=3D') || cleaned.includes('=\r\n') || cleaned.includes('=\n'))
    ) {
      try {
        cleaned = quotedPrintable.decode(cleaned);
      } catch (_e) {
        // If standard decode fails, try to fix common softness
        cleaned = cleaned.replace(/=\r?\n/g, '');
      }
    }

    // Contextual MIME Repair: Infer masked characters
    // The user identified that '=' sometimes replaces any alphanumeric character.
    // Example: "=9yo" -> "19yo", "th=y" -> "they"
    cleaned = TextCleaner.repairMimeWildcards(cleaned);

    // 1. Decode HTML entities (e.g., &nbsp;, &amp;)
    cleaned = decode(cleaned);

    // 3. Fix common Windows-1252 / UTF-8 Mojibake
    cleaned = cleaned
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"') // incomplete quote
      .replace(/â€“/g, '-')
      .replace(/â€¦/g, '...');

    // 3. Remove Null bytes and replacement characters
    cleaned = cleaned.replace(/\u0000/g, '').replace(/\uFFFD/g, '');

    // 4. Normalize Line Breaks
    // Collapse multiple empty lines into max 2
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');

    // 5. Remove commonly seen MIME boundary markers leaking into text
    cleaned = cleaned.replace(/--+[a-zA-Z0-9]+--+/g, '');
    cleaned = cleaned.replace(/Content-Type:.*$/gim, '');
    cleaned = cleaned.replace(/Content-Transfer-Encoding:.*$/gim, '');

    return cleaned.trim();
  }

  /**
   * Internal dictionary of common words for contextual repair.
   * Derived from the corpus frequency analysis.
   */
  private static COMMON_WORDS = new Set([
    'the',
    'of',
    'and',
    'to',
    'in',
    'is',
    'for',
    'that',
    'it',
    'as',
    'be',
    'are',
    'on',
    'with',
    'at',
    'this',
    'by',
    'from',
    'they',
    'we',
    'she',
    'he',
    'was',
    'her',
    'his',
    'or',
    'an',
    'will',
    'my',
    'one',
    'all',
    'would',
    'there',
    'their',
    'what',
    'so',
    'up',
    'out',
    'if',
    'about',
    'who',
    'get',
    'which',
    'go',
    'me',
    'when',
    'make',
    'can',
    'like',
    'time',
    'no',
    'just',
    'him',
    'know',
    'take',
    'person',
    'people',
    'into',
    'year',
    'your',
    'good',
    'some',
    'could',
    'them',
    'see',
    'other',
    'than',
    'then',
    'now',
    'look',
    'only',
    'come',
    'its',
    'over',
    'think',
    'also',
    'back',
    'after',
    'use',
    'how',
    'our',
    'work',
    'first',
    'well',
    'way',
    'even',
    'new',
    'want',
    'because',
    'any',
    'these',
    'give',
    'day',
    'most',
    'us',
    'where',
    'when',
    'why',
    'who',
    'how',
    'which',
    'what',
    'whose',
    'whom',
    'there',
    'their',
    'they',
    'them',
    'these',
    'those',
    'that',
    'this',
    'girl',
    'woman',
    'child',
    'children',
    'young',
    'years',
    'old',
    'age',
    'born',
    'birth',
    'date',
    'address',
    'island',
    'thomas',
    'virgin',
    'islands',
    'estate',
    'property',
    'owner',
    'trust',
    'account',
    'financial',
    'bank',
    'transfer',
    'payment',
    'money',
    'evidence',
    'document',
    'manual',
    'staff',
    'employee',
    'legal',
    'law',
    'case',
    'court',
    'judge',
    'warrant',
    'search',
    'seizure',
    'redacted',
    'security',
    'emergency',
    'doctor',
    'medical',
    'hospital',
    'health',
    'condition',
    'treatment',
  ]);

  /**
   * Identifies words where '=' is acting as an alphanumeric wildcard and attempts to infer the missing character.
   */
  static repairMimeWildcards(text: string): string {
    if (!text.includes('=')) return text;

    // 1. General word repair: th=y -> they, wh=n -> when, wh=re -> where
    let repaired = text.replace(/\b([a-zA-Z0-9]+)=([a-zA-Z0-9]+)\b/g, (match, prefix, suffix) => {
      // Skip if it looks like a valid QP hex code
      if (prefix === '' && /^[0-9A-Fa-f]{2}$/.test(suffix.substring(0, 2))) return match;

      const alphabet = 'etainosrdhdlucmfgypwbvkxjqz1234567890'; // ordered by frequency
      for (const char of alphabet) {
        const candidate = (prefix + char + suffix).toLowerCase();
        if (this.COMMON_WORDS.has(candidate)) {
          return prefix + char + suffix;
        }
      }
      return match;
    });

    // 2. Numeric/Age repair: =9yo -> 19yo, =5 days -> 15 days
    // Specific corruption: '1' often becomes '=' in this dataset
    repaired = repaired.replace(/(^|\s)=(\d+)/g, (match, space, digits) => {
      // If it's isolated or followed by common age/time markers, prefer '1'
      const context = repaired.substring(
        repaired.indexOf(match) + match.length,
        repaired.indexOf(match) + match.length + 10,
      );
      if (/yo\b|years?|days?|months?|am\b|pm\b/i.test(context) || context.trim() === '') {
        return space + '1' + digits;
      }
      return match;
    });

    return repaired;
  }

  /**
   * Cleans text extracted via OCR (PDF or Image).

   * Focuses on layout repair, garbage character removal, and typo fixing.
   */
  static cleanOcrText(text: string): string {
    if (!text) return '';

    let cleaned = text;

    // 1. Remove Null bytes
    cleaned = cleaned.replace(/\u0000/g, '');

    // 2. Fix broken hyphenation at line ends
    // "com- \n plete" -> "complete"
    cleaned = cleaned.replace(/([a-z])-\s*\n\s*([a-z])/gi, '$1$2');

    // 3. Join lines that shouldn't be split
    // Heuristic: If line ends with a lower case letter and next starts with lower case, join them.
    // Be careful not to merge headers or lists.
    // This is simple/aggressive: "word \n word" -> "word word"
    // cleaned = cleaned.replace(/([a-z])\s*\n\s*([a-z])/g, '$1 $2');
    // ^ Commented out: too risky for structured docs without more context.

    // 4. Fix common OCR character confusion (mostly for numbers/letters in specific contexts if possible)
    // E.g. "l" as "1" or "O" as "0" is hard without a dictionary.
    // But we can clean "garbage" lines.

    // 5. Remove "Garbage" lines
    // Lines that are mostly symbols/numbers with few vowels/letters
    const lines = cleaned.split('\n');
    const validLines = lines.filter((line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return true;
      if (trimmed.length < 3) return true; // keep page numbers etc

      // Calculate ratio of alphanumeric chars
      const alpha = (trimmed.match(/[a-zA-Z]/g) || []).length;
      const total = trimmed.length;

      // If line is long (>10 chars) but has very few letters (< 20%), it's likely noise/separators
      if (total > 10 && alpha / total < 0.2) {
        return false;
      }
      return true;
    });

    cleaned = validLines.join('\n');

    // 6. Normalize whitespace
    cleaned = cleaned.replace(/[ \t]+/g, ' '); // collapse horizontal whitespace

    return cleaned.trim();
  }
}
