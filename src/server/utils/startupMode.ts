type EnvLike = Partial<Record<string, string | undefined>>;

function normalize(value: string | undefined): string {
  return value?.trim() ?? '';
}

export function shouldBootInDegradedMode(env: EnvLike = process.env): boolean {
  return normalize(env.NODE_ENV) !== 'production' && !normalize(env.DATABASE_URL);
}

export function isDegradedModeEnabled(env: EnvLike = process.env): boolean {
  return normalize(env.DEGRADED_MODE) === '1' || shouldBootInDegradedMode(env);
}
