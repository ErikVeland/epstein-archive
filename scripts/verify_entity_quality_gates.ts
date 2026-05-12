#!/usr/bin/env tsx

export {};

const baseUrl = (process.env.DEPLOY_VERIFY_URL || process.argv[2] || '').replace(/\/+$/, '');
const timeoutMs = Math.max(1000, Number(process.env.DEPLOY_VERIFY_TIMEOUT_MS || 30_000) || 30_000);

if (!baseUrl) {
  console.error('DEPLOY_VERIFY_URL is required, for example https://epstein.academy');
  process.exit(1);
}

const junkNameRegexes = [
  /^(to|from|cc|bcc|subject|re|fwd|fw|sent|received)\b[:\s-]*/i,
  /^(on|at|in|with)\s+(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/i,
  /\b(mon|tue|wed|thu|fri|sat|sun)\s*$/i,
  /\b([a-z]{3,})\s+\1\b/i,
  /\b(department|office|policy|inc|llc|corp|corporation|ltd|associates|foundation|trust|university|school|academy|committee|ministry|agency|bureau|division|building|street|road|avenue|contact|privacy|terms)\b/i,
  /\b(bluray|blu-ray|disc|rewritable|dumpster|hauls|columns|demolition|ditchin|postage|acoustics|personnel|persoanel)\b/i,
  /^(east|west|north|south)\s+(if|aft|aftstreet|street|road|avenue)\b/i,
  /\b(direction|provided)\s*$/i,
  /\b(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\s*$/i,
];

function normalizeName(name: unknown): string {
  return String(name || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function isJunkName(name: unknown): boolean {
  const normalized = normalizeName(name);
  if (!normalized) return true;
  if (normalized === 'jeffrey epstein' || normalized === 'donald trump') return false;
  return junkNameRegexes.some((regex) => regex.test(normalized));
}

async function getJson(path: string): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok)
        throw new Error(`${path} status=${response.status} body=${text.slice(0, 160)}`);
      const json = JSON.parse(text || '{}') as Record<string, unknown>;
      return json;
    } catch (error) {
      throw new Error(`${path} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

function extractArray(body: Record<string, unknown>, keys: string[]): Record<string, unknown>[] {
  for (const key of keys) {
    const value = body[key];
    if (Array.isArray(value)) return value as Record<string, unknown>[];
  }
  if (body.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
    for (const key of keys) {
      const value = (body.data as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value as Record<string, unknown>[];
    }
  }
  return [];
}

async function assertSubjectGate(sortBy: string) {
  const body = await getJson(`/api/entities/subjects?page=1&limit=25&sortBy=${sortBy}`);
  const subjects = extractArray(body, ['subjects', 'data', 'entities']);
  const names = subjects.map((subject) => subject.name ?? subject.fullName ?? subject.full_name);

  if (normalizeName(names[0]) !== 'jeffrey epstein' || normalizeName(names[1]) !== 'donald trump') {
    throw new Error(
      `${sortBy} top subjects failed: got ${names.slice(0, 5).map(String).join(', ')}`,
    );
  }

  const junk = names.find(isJunkName);
  if (junk) throw new Error(`${sortBy} surfaced junk entity: ${String(junk)}`);

  console.log(`[PASS] ${sortBy} subject gate: ${names.slice(0, 2).join(' > ')}`);
}

async function assertEntitiesGate(sortBy: string) {
  const body = await getJson(`/api/entities?page=1&limit=25&sortBy=${sortBy}`);
  const entities = extractArray(body, ['entities', 'data', 'subjects']);
  const names = entities.map((entity) => entity.name ?? entity.fullName ?? entity.full_name);

  if (normalizeName(names[0]) !== 'jeffrey epstein' || normalizeName(names[1]) !== 'donald trump') {
    throw new Error(
      `${sortBy} top entities failed: got ${names.slice(0, 5).map(String).join(', ')}`,
    );
  }

  const junk = names.find(isJunkName);
  if (junk)
    throw new Error(`${sortBy} surfaced junk entity through /api/entities: ${String(junk)}`);

  console.log(`[PASS] ${sortBy} entities gate: ${names.slice(0, 2).join(' > ')}`);
}

async function assertSearchGate(query: string) {
  const body = await getJson(`/api/search?q=${encodeURIComponent(query)}&limit=25`);
  const entities = extractArray(body, ['entities']);
  const names = entities.map((entity) => entity.name ?? entity.fullName ?? entity.full_name);
  const junk = names.find(isJunkName);
  if (junk) throw new Error(`search "${query}" surfaced junk entity: ${String(junk)}`);
  console.log(`[PASS] search gate "${query}": entityResults=${entities.length}`);
}

async function main() {
  await assertSubjectGate('red_flag');
  await assertSubjectGate('mentions');
  await assertEntitiesGate('red_flag');
  await assertEntitiesGate('mentions');
  await assertSearchGate('department');
  await assertSearchGate('associates inc');
  await assertSearchGate('bluray disc');
  await assertSearchGate('dumpster hauls provided');
  await assertSearchGate('search persoanel name');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
