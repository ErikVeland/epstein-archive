import crypto from 'node:crypto';

export const OCR_CLEAN_ARTIFACT_VERSION = 'ocr-clean-v2';
export const OCR_CLEAN_PROMPT_VERSION = 'forensic-ocr-clean-v2';
const NON_TEXT_MODEL_PATTERN = /(?:^|[-_/])vl(?:[-_/]|$)|vision|embed|rerank/i;

export interface OcrCleanupValidation {
  accepted: boolean;
  score: number;
  lengthRatio: number;
  wordRetention: number;
  wordPrecision: number;
  numericRetention: number;
  missingCriticalTokens: string[];
  addedCriticalTokens: string[];
  reasons: string[];
}

export function selectOcrCleanupModels(modelIds: string[]): string[] {
  return modelIds.filter((modelId) => !NON_TEXT_MODEL_PATTERN.test(modelId));
}

function splitLongBlock(block: string, maxChars: number): string[] {
  const chunks: string[] = [];
  let remaining = block.trim();
  while (remaining.length > maxChars) {
    const window = remaining.slice(0, maxChars + 1);
    const boundary = Math.max(window.lastIndexOf('\n'), window.lastIndexOf(' '));
    const splitAt = boundary >= Math.floor(maxChars * 0.6) ? boundary : maxChars;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

export function splitOcrText(text: string, maxChars = 3200): string[] {
  const blocks = text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .flatMap((block) => splitLongBlock(block, maxChars));

  const chunks: string[] = [];
  let current = '';
  for (const block of blocks) {
    if (current && current.length + block.length + 2 > maxChars) {
      chunks.push(current);
      current = block;
    } else {
      current = current ? `${current}\n\n${block}` : block;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function tokens(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]{2,}/gu) || [];
}

function retention(input: string[], output: string[]): number {
  if (input.length === 0) return 1;
  const outputCounts = new Map<string, number>();
  for (const token of output) outputCounts.set(token, (outputCounts.get(token) || 0) + 1);
  let retained = 0;
  for (const token of input) {
    const count = outputCounts.get(token) || 0;
    if (count > 0) {
      retained += 1;
      outputCounts.set(token, count - 1);
    }
  }
  return retained / input.length;
}

function sameTokenMultiset(left: string[], right: string[]): boolean {
  return retention(left, right) === 1 && retention(right, left) === 1;
}

function numericTokens(text: string): string[] {
  return text.match(/\b\d+(?:[.,:/-]\d+)*\b/g) || [];
}

function criticalTokens(text: string): string[] {
  return Array.from(
    new Set(text.match(/\b(?:EFTA\d+|HOUSE_OVERSIGHT_\d+|DOJ[-_ ]?[A-Z0-9-]{4,})\b/gi) || []),
  );
}

export function validateOcrCleanup(input: string, output: string): OcrCleanupValidation {
  const trimmed = output.trim();
  const lengthRatio = input.length > 0 ? trimmed.length / input.length : 0;
  const wordRetention = retention(tokens(input), tokens(trimmed));
  const wordPrecision = retention(tokens(trimmed), tokens(input));
  const numericRetention = retention(numericTokens(input), numericTokens(trimmed));
  const missingCriticalTokens = criticalTokens(input).filter(
    (token) => !trimmed.toLowerCase().includes(token.toLowerCase()),
  );
  const addedCriticalTokens = criticalTokens(trimmed).filter(
    (token) => !input.toLowerCase().includes(token.toLowerCase()),
  );
  const reasons: string[] = [];

  if (!trimmed) reasons.push('empty-output');
  if (lengthRatio < 0.72) reasons.push('excessive-deletion');
  if (lengthRatio > 1.35) reasons.push('excessive-expansion');
  if (wordRetention < 0.7) reasons.push('low-word-retention');
  if (wordPrecision < 0.85) reasons.push('excessive-novel-wording');
  if (!sameTokenMultiset(numericTokens(input), numericTokens(trimmed))) {
    reasons.push('numeric-token-change');
  }
  if (missingCriticalTokens.length > 0) reasons.push('evidence-identifier-loss');
  if (addedCriticalTokens.length > 0) reasons.push('evidence-identifier-addition');
  if (/^(?:certainly|sure|here(?:'s| is)|the cleaned text)/i.test(trimmed)) {
    reasons.push('conversational-preamble');
  }

  const score = Math.max(
    0,
    Math.min(
      1,
      wordRetention * 0.4 +
        wordPrecision * 0.15 +
        numericRetention * 0.3 +
        (1 - Math.min(1, Math.abs(1 - lengthRatio))) * 0.15,
    ),
  );
  return {
    accepted: reasons.length === 0,
    score,
    lengthRatio,
    wordRetention,
    wordPrecision,
    numericRetention,
    missingCriticalTokens,
    addedCriticalTokens,
    reasons,
  };
}

export function preserveOcrSource(input: string): {
  output: string;
  validation: OcrCleanupValidation;
} {
  return { output: input, validation: validateOcrCleanup(input, input) };
}

export function ocrCleanupInputHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}
