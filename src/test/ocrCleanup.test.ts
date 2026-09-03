import { describe, expect, it } from 'vitest';
import {
  preserveOcrSource,
  selectOcrCleanupModels,
  splitOcrText,
  validateOcrCleanup,
} from '../../scripts/pipeline/ocrCleanup.js';

describe('safe OCR cleanup', () => {
  it('preserves exact source text when model output cannot be accepted', () => {
    const source = 'EFTA00000123 Account total 4,500 on 03/12/2025.';
    const preserved = preserveOcrSource(source);
    expect(preserved.output).toBe(source);
    expect(preserved.validation.accepted).toBe(true);
  });

  it('routes only text-generation models', () => {
    expect(
      selectOcrCleanupModels([
        'mlx-community/Qwen3-VL-4B-Instruct-4bit',
        'mlx-community/Qwen3.5-2B-MLX-8bit',
        'text-embedding-model',
        'mlx-community/Llama-3.2-3B-Instruct-8bit',
      ]),
    ).toEqual(['mlx-community/Qwen3.5-2B-MLX-8bit', 'mlx-community/Llama-3.2-3B-Instruct-8bit']);
  });

  it('splits all text without dropping long trailing content', () => {
    const text = `${'Alpha beta gamma '.repeat(400)}\n\n${'Final evidence line '.repeat(200)}`;
    const chunks = splitOcrText(text, 500);
    expect(chunks.length).toBeGreaterThan(10);
    expect(chunks.at(-1)).toContain('Final evidence line');
  });

  it('accepts conservative whitespace and hyphenation cleanup', () => {
    const input = 'EFTA00001234\n\nThe con-\nfidential account total was 1,250.00 on 12/03/2025.';
    const output = 'EFTA00001234\n\nThe confidential account total was 1,250.00 on 12/03/2025.';
    expect(validateOcrCleanup(input, output)).toMatchObject({ accepted: true });
  });

  it('rejects lost numbers and evidence identifiers', () => {
    const input = 'EFTA00001234 The account total was 1,250.00 on 12/03/2025.';
    const output = 'The account total was 1,500.00 in 2025.';
    const validation = validateOcrCleanup(input, output);
    expect(validation.accepted).toBe(false);
    expect(validation.reasons).toContain('numeric-token-change');
    expect(validation.reasons).toContain('evidence-identifier-loss');
  });

  it('rejects invented numbers and evidence identifiers', () => {
    const input = 'The account entry was recorded in the source ledger.';
    const output = 'The account entry EFTA99999999 was recorded as 2,500 in the source ledger.';
    const validation = validateOcrCleanup(input, output);
    expect(validation.accepted).toBe(false);
    expect(validation.reasons).toContain('numeric-token-change');
    expect(validation.reasons).toContain('evidence-identifier-addition');
  });

  it('rejects summaries that delete most source text', () => {
    const input = 'This is source evidence with names, dates, and details. '.repeat(30);
    expect(validateOcrCleanup(input, 'Short summary.').accepted).toBe(false);
  });
});
