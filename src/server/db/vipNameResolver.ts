import { entitiesQueries } from '@epstein/db';
import { getApiPool } from './connection.js';
import {
  normalizeEntityNameToken,
  stripEntityHonorificPrefix,
  unwrapEntityNameCandidates,
} from '../../shared/entityNameNormalization.js';

const VIP_DISPLAY_FALLBACKS = new Map<string, string>([
  ['joseph biden', 'Joe Biden'],
  ['joseph r biden', 'Joe Biden'],
  ['president joseph biden', 'Joe Biden'],
  ['president joe biden', 'Joe Biden'],
  ['middleton mark', 'Mark Middleton'],
  ['the donald', 'Donald Trump'],
  ['global girl', 'Nadia Marcinkova'],
  ['puff daddy', 'Sean "Diddy" Combs'],
  ['sarah vickers', 'Sarah Kellen'],
  ['melania knauss', 'Melania Trump'],
  ['nadia marcinko', 'Nadia Marcinkova'],
  ['allen dershowitz', 'Alan Dershowitz'],
  ['sir mick jagger', 'Mick Jagger'],
  ['epstein jeffrey epstein', 'Jeffrey Epstein'],
  ['did jeffrey epstein', 'Jeffrey Epstein'],
]);

const VIP_LOOKUP_TTL_MS = 5 * 60 * 1000;
let vipLookupCache: { value: Map<string, string>; expiresAt: number } | null = null;

function upsertVipAlias(
  map: Map<string, { canonicalName: string; score: number }>,
  alias: string,
  canonicalName: string,
  score: number,
): void {
  const key = normalizeEntityNameToken(alias);
  if (!key) return;
  const current = map.get(key);
  const preferCandidateOnTie =
    current !== undefined &&
    score === current.score &&
    !canonicalName.includes(',') &&
    current.canonicalName.includes(',');
  if (!current || score > current.score || preferCandidateOnTie) {
    map.set(key, { canonicalName, score });
  }
}

export async function buildVipDisplayLookup(): Promise<Map<string, string>> {
  const now = Date.now();
  if (vipLookupCache && vipLookupCache.expiresAt > now) return vipLookupCache.value;

  let raw: Array<{ full_name?: string; mentions?: number; aliases?: string }> = [];
  try {
    raw = await entitiesQueries.getVipEntities.run(undefined, getApiPool());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code || '')
        : '';
    const isTimeout =
      code === '57014' || /statement timeout|query read timeout|timeout/i.test(message);
    if (!isTimeout) throw error;

    const degradedLookup = vipLookupCache?.value ?? new Map<string, string>();
    vipLookupCache = { value: degradedLookup, expiresAt: now + 60_000 };
    return degradedLookup;
  }
  const bestByAlias = new Map<string, { canonicalName: string; score: number }>();

  for (const row of raw) {
    const canonicalName = String(row.full_name || '').trim();
    if (!canonicalName) continue;
    const score = Number(row.mentions || 0);
    upsertVipAlias(bestByAlias, canonicalName, canonicalName, score);

    const stripped = stripEntityHonorificPrefix(canonicalName);
    if (stripped) upsertVipAlias(bestByAlias, stripped, canonicalName, score);

    for (const alias of String(row.aliases || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)) {
      upsertVipAlias(bestByAlias, alias, canonicalName, score);
      const aliasStripped = stripEntityHonorificPrefix(alias);
      if (aliasStripped) upsertVipAlias(bestByAlias, aliasStripped, canonicalName, score);
    }
  }

  const lookup = new Map(Array.from(bestByAlias.entries()).map(([k, v]) => [k, v.canonicalName]));
  vipLookupCache = { value: lookup, expiresAt: now + VIP_LOOKUP_TTL_MS };
  return lookup;
}

export function resolveCanonicalVipName(name: string, lookup: Map<string, string>): string {
  const trimmed = name.trim();
  if (!trimmed) return name;

  for (const candidate of unwrapEntityNameCandidates(trimmed)) {
    const direct =
      VIP_DISPLAY_FALLBACKS.get(candidate) ||
      VIP_DISPLAY_FALLBACKS.get(stripEntityHonorificPrefix(candidate)) ||
      lookup.get(candidate) ||
      lookup.get(stripEntityHonorificPrefix(candidate));
    if (direct) return direct;
  }

  return trimmed;
}
