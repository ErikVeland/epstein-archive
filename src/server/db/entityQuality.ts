import {
  ENTITY_BLACKLIST_PATTERNS,
  ENTITY_PARTIAL_BLOCKLIST,
} from '../../shared/config/entityBlacklist.js';

const CANONICAL_PRIORITY_NAMES = new Map([
  ['jeffrey epstein', 0],
  ['donald trump', 1],
]);

const JUNK_NAME_REGEXES = [
  /^(to|from|cc|bcc|subject|re|fwd|fw|sent|received)\b[:\s-]*/i,
  /^(on|at|in|with)\s+(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/i,
  /\b(mon|tue|wed|thu|fri|sat|sun)\s*$/i,
  /\b([a-z]{3,})\s+\1\b/i,
  /\b(department|office|policy|inc|llc|corp|corporation|ltd|associates|foundation|trust|university|school|academy|committee|ministry|agency|bureau|division|building|street|road|avenue|contact|privacy|terms)\b/i,
  /\b(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\s*$/i,
  /\b\w+'?s\s+(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\b/i,
  /^(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\b/i,
];

const SQL_JUNK_REGEXES = [
  String.raw`^(to|from|cc|bcc|subject|re|fwd|fw|sent|received)\b[:\s-]*`,
  String.raw`^(on|at|in|with)\s+(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b`,
  String.raw`\b(mon|tue|wed|thu|fri|sat|sun)\s*$`,
  String.raw`\b([[:alpha:]]{3,})\s+\1\b`,
  String.raw`\b(department|office|policy|inc|llc|corp|corporation|ltd|associates|foundation|trust|university|school|academy|committee|ministry|agency|bureau|division|building|street|road|avenue|contact|privacy|terms)\b`,
  String.raw`\b(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\s*$`,
  String.raw`\b[[:alpha:]]+'?s\s+(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\b`,
  String.raw`^(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\b`,
];

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function canonicalEntityPriority(name: unknown): number {
  return CANONICAL_PRIORITY_NAMES.get(normalizeName(String(name || ''))) ?? 2;
}

export function isJunkEntityName(name: unknown): boolean {
  const normalized = normalizeName(String(name || ''));
  if (!normalized) return true;
  if (CANONICAL_PRIORITY_NAMES.has(normalized)) return false;
  if (normalized.length < 3) return true;

  if (ENTITY_PARTIAL_BLOCKLIST.some((phrase) => normalized.includes(phrase.toLowerCase()))) {
    return true;
  }

  if (
    ENTITY_BLACKLIST_PATTERNS.some((pattern) =>
      new RegExp(`\\b${escapeRegex(pattern)}\\b`, 'i').test(normalized),
    )
  ) {
    return true;
  }

  return JUNK_NAME_REGEXES.some((regex) => regex.test(normalized));
}

export function entityQualityWhereSql(alias = 'e'): string {
  const nameExpr = `LOWER(COALESCE(${alias}.full_name, ''))`;
  const regexClauses = SQL_JUNK_REGEXES.map((regex) => `${nameExpr} !~* $junk$${regex}$junk$`);
  const partialClauses = ENTITY_PARTIAL_BLOCKLIST.map(
    (phrase) => `${nameExpr} NOT LIKE '%${phrase.toLowerCase().replace(/'/g, "''")}%'`,
  );
  const blacklistClauses = ENTITY_BLACKLIST_PATTERNS.map(
    (pattern) => `${nameExpr} !~* $junk$\\m${pattern.replace(/[\\$]/g, '\\$&')}\\M$junk$`,
  );

  return [
    `COALESCE(${alias}.junk_tier, 'clean') = 'clean'`,
    `COALESCE(${alias}.quarantine_status, 0) = 0`,
    `${alias}.full_name IS NOT NULL`,
    `BTRIM(${alias}.full_name) != ''`,
    ...regexClauses,
    ...partialClauses,
    ...blacklistClauses,
  ].join('\n            AND ');
}
