const VISION_MODEL_PATTERN = /(?:^|[-_/])vl(?:[-_/]|$)|vision/i;

export function selectSummaryModels(modelPool: string[]): string[] {
  const textModels = modelPool.filter((model) => !VISION_MODEL_PATTERN.test(model));
  return textModels.length > 0 ? textModels : modelPool;
}

export function resolveSummaryConcurrency(
  summaryModels: string[],
  configuredValue: string | undefined,
): number {
  const modelCapacity = Math.max(1, summaryModels.length);
  const requested = Number.parseInt(configuredValue || String(modelCapacity), 10);
  const validRequested = Number.isFinite(requested) ? requested : modelCapacity;
  return Math.max(1, Math.min(validRequested, modelCapacity, 16));
}

export function resolveSummaryFetchBatchSize(batchSize: number, concurrency: number): number {
  return Math.max(batchSize, concurrency * 25);
}
