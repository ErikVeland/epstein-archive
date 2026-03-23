const inFlight = new Map<string, Promise<unknown>>();

export function stableStringify(obj: unknown): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return String(obj);
  if (Array.isArray(obj)) {
    return '[' + (obj as unknown[]).map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return (
    '{' +
    keys.map((k) => `${k}:${stableStringify((obj as Record<string, unknown>)[k])}`).join(',') +
    '}'
  );
}

export function singleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }
  const req = fn().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, req);
  return req;
}
