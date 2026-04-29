export type ConfidenceAlgorithmVersion = 'forensic-confidence-v1';

export interface ConfidenceWeights {
  coverage: number;
  signalQuality: number;
  corroboration: number;
  modelCertainty: number;
}

export interface ConfidenceInput {
  toolId: string;
  count: number;
  ingestRunId?: string | null;
  rulesetVersion?: string | null;
  modelId?: string | null;
  timestamp?: string;
  factors: {
    coverage: number | null;
    signalQuality: number | null;
    corroboration: number | null;
    modelCertainty: number | null;
  };
  factorInputs?: Record<string, unknown>;
}

export interface ConfidenceResult {
  algorithm: ConfidenceAlgorithmVersion;
  weights: ConfidenceWeights;
  finalScore: number | null;
  factors: {
    coverage: number | null;
    signalQuality: number | null;
    corroboration: number | null;
    modelCertainty: number | null;
  };
  rawWeighted: number | null;
  missingInputs: string[];
  determinism: {
    deterministic: boolean;
    reason: string;
  };
  metadata: {
    ingestRunId: string | null;
    rulesetVersion: string | null;
    modelId: string | null;
    computedAt: string;
    cacheKey: string;
  };
  factorInputs: Record<string, unknown>;
}

const ALGORITHM: ConfidenceAlgorithmVersion = 'forensic-confidence-v1';
const DEFAULT_WEIGHTS: ConfidenceWeights = {
  coverage: 0.4,
  signalQuality: 0.25,
  corroboration: 0.25,
  modelCertainty: 0.1,
};

const scoreCache = new Map<string, ConfidenceResult>();

const clamp01 = (value: number | null): number | null => {
  if (value === null || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(1, value));
};

const stableRound = (value: number): number => Math.round(value * 10000) / 10000;

const buildCacheKey = (input: ConfidenceInput): string => {
  const normalized = {
    algorithm: ALGORITHM,
    toolId: input.toolId,
    count: input.count,
    ingestRunId: input.ingestRunId || null,
    rulesetVersion: input.rulesetVersion || null,
    modelId: input.modelId || null,
    factors: {
      coverage: clamp01(input.factors.coverage),
      signalQuality: clamp01(input.factors.signalQuality),
      corroboration: clamp01(input.factors.corroboration),
      modelCertainty: clamp01(input.factors.modelCertainty),
    },
    factorInputs: input.factorInputs || {},
  };
  return JSON.stringify(normalized);
};

export const computeForensicConfidence = (input: ConfidenceInput): ConfidenceResult => {
  const cacheKey = buildCacheKey(input);
  const cached = scoreCache.get(cacheKey);
  if (cached) return cached;

  const factors = {
    coverage: clamp01(input.factors.coverage),
    signalQuality: clamp01(input.factors.signalQuality),
    corroboration: clamp01(input.factors.corroboration),
    modelCertainty: clamp01(input.factors.modelCertainty),
  };

  const missingInputs: string[] = [];
  if (input.count <= 0) {
    missingInputs.push('No evidence inputs linked to this tool');
  }
  (Object.keys(factors) as Array<keyof typeof factors>).forEach((name) => {
    if (factors[name] === null) missingInputs.push(`Missing factor: ${name}`);
  });

  const hasInputs = input.count > 0 && factors.coverage !== null;

  const weighted = hasInputs
    ? stableRound(
        (factors.coverage || 0) * DEFAULT_WEIGHTS.coverage +
          (factors.signalQuality || 0) * DEFAULT_WEIGHTS.signalQuality +
          (factors.corroboration || 0) * DEFAULT_WEIGHTS.corroboration +
          (factors.modelCertainty || 0) * DEFAULT_WEIGHTS.modelCertainty,
      )
    : null;

  const result: ConfidenceResult = {
    algorithm: ALGORITHM,
    weights: DEFAULT_WEIGHTS,
    finalScore: weighted === null ? null : Math.round(weighted * 100),
    factors,
    rawWeighted: weighted,
    missingInputs,
    determinism: {
      deterministic: true,
      reason:
        'Pure weighted scoring; no randomization. Cache key includes ingest run, ruleset, model and factor inputs.',
    },
    metadata: {
      ingestRunId: input.ingestRunId || null,
      rulesetVersion: input.rulesetVersion || null,
      modelId: input.modelId || null,
      computedAt: input.timestamp || new Date().toISOString(),
      cacheKey,
    },
    factorInputs: input.factorInputs || {},
  };

  scoreCache.set(cacheKey, result);
  return result;
};

export const clearForensicConfidenceCache = () => {
  scoreCache.clear();
};
