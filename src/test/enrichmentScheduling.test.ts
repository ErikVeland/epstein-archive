import { describe, expect, it } from 'vitest';
import {
  resolveSummaryConcurrency,
  resolveSummaryFetchBatchSize,
  selectSummaryModels,
} from '../../scripts/pipeline/enrichmentScheduling.js';

describe('enrichment scheduling', () => {
  it('reserves vision models when text models are callable', () => {
    expect(
      selectSummaryModels([
        'mlx-community/Qwen3-VL-4B-Instruct-4bit',
        'mlx-community/Qwen3.5-9B-4bit',
        'mlx-community/Llama-3.2-3B-Instruct-4bit',
      ]),
    ).toEqual(['mlx-community/Qwen3.5-9B-4bit', 'mlx-community/Llama-3.2-3B-Instruct-4bit']);
  });

  it('falls back to a vision model when no text model is callable', () => {
    expect(selectSummaryModels(['mlx-community/Qwen3-VL-4B-Instruct-4bit'])).toEqual([
      'mlx-community/Qwen3-VL-4B-Instruct-4bit',
    ]);
  });

  it('caps concurrency at callable model capacity', () => {
    expect(resolveSummaryConcurrency(['text-a', 'text-b'], '8')).toBe(2);
    expect(resolveSummaryConcurrency(['text-a', 'text-b'], undefined)).toBe(2);
  });

  it('amortizes queue reads across multiple inference batches', () => {
    expect(resolveSummaryFetchBatchSize(3, 2)).toBe(50);
    expect(resolveSummaryFetchBatchSize(100, 2)).toBe(100);
  });
});
