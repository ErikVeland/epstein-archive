import { describe, expect, it } from 'vitest';
import { canUseEntityFuzzyFallback } from '../server/db/searchRepository.js';

describe('entity fuzzy fallback policy', () => {
  it('keeps human names eligible for fuzzy entity matching', () => {
    expect(canUseEntityFuzzyFallback('Jean Luc Brunel')).toBe(true);
    expect(canUseEntityFuzzyFallback("O'Connor, Jane")).toBe(true);
  });

  it('does not hold source identifiers behind an irrelevant entity scan', () => {
    expect(canUseEntityFuzzyFallback('EFTA01180488')).toBe(false);
    expect(canUseEntityFuzzyFallback('DOJ-2026-001234')).toBe(false);
    expect(canUseEntityFuzzyFallback('/release/item/123456')).toBe(false);
  });
});
