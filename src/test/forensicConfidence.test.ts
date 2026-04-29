import { describe, expect, it } from 'vitest';

import {
  clearForensicConfidenceCache,
  computeForensicConfidence,
} from '../client/utils/forensicConfidence';

describe('forensic confidence', () => {
  it('produces deterministic scores and cache keys', () => {
    clearForensicConfidenceCache();

    const baseInput = {
      toolId: 'documents',
      count: 12,
      ingestRunId: 'run-001',
      rulesetVersion: 'forensic-rules-v1',
      modelId: 'model-alpha',
      factors: {
        coverage: 0.8,
        signalQuality: 0.7,
        corroboration: 0.6,
        modelCertainty: 0.9,
      },
      factorInputs: {
        documentCount: 12,
        timelineCount: 4,
      },
    };

    const first = computeForensicConfidence(baseInput);
    const second = computeForensicConfidence(baseInput);

    expect(first.finalScore).toBe(second.finalScore);
    expect(first.metadata.cacheKey).toBe(second.metadata.cacheKey);

    const changedRun = computeForensicConfidence({ ...baseInput, ingestRunId: 'run-002' });
    expect(first.metadata.cacheKey).not.toBe(changedRun.metadata.cacheKey);

    const changedRuleset = computeForensicConfidence({
      ...baseInput,
      rulesetVersion: 'forensic-rules-v2',
    });
    expect(first.metadata.cacheKey).not.toBe(changedRuleset.metadata.cacheKey);
  });

  it('returns a null score when required inputs are missing', () => {
    const empty = computeForensicConfidence({
      toolId: 'documents',
      count: 0,
      ingestRunId: 'run-001',
      rulesetVersion: 'forensic-rules-v1',
      modelId: 'model-alpha',
      factors: {
        coverage: null,
        signalQuality: null,
        corroboration: null,
        modelCertainty: null,
      },
    });

    expect(empty.finalScore).toBeNull();
    expect(empty.missingInputs.length).toBeGreaterThan(0);
  });
});
