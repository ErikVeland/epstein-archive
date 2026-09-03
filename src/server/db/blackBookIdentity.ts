export interface BlackBookIdentity {
  id: number;
  fullName: string;
  isVip: boolean;
  thumbnailPath: string | null;
}

export type BlackBookMatchStatus = 'name_match' | 'possible_match' | 'ambiguous' | 'unresolved';

// Compare complete names only. Household entries and short fragments must not
// acquire an identity from a shared surname or a partial alias.
export function blackBookNameKey(name: string): string | null {
  if (/[\d&]|\band\b|\b(?:jr|junior|sr|senior)\b/i.test(name)) return null;
  const tokens = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length < 2 || tokens.length > 4 || tokens.some((token) => token.length < 2))
    return null;
  return tokens.sort().join(' ');
}

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
    if (Math.min(...current) > 2) return 3;
  }
  return previous[b.length];
}

type MatchResult = {
  status: BlackBookMatchStatus;
  identity: BlackBookIdentity | null;
};

export function createBlackBookIdentityMatcher(
  identities: BlackBookIdentity[],
): (sourceName: string) => MatchResult {
  const indexed = identities.map((identity) => ({
    identity,
    key: blackBookNameKey(identity.fullName),
  }));
  return (sourceName) => {
    const key = blackBookNameKey(sourceName);
    if (!key) return { status: 'unresolved', identity: null };
    const exact = indexed.filter((item) => item.key === key);
    if (exact.length === 1) return { status: 'name_match', identity: exact[0].identity };
    if (exact.length > 1) return { status: 'ambiguous', identity: null };
    const possible = indexed.filter(
      (item) =>
        item.key &&
        key.length >= 10 &&
        editDistance(key, item.key) <= Math.min(2, Math.floor(key.length * 0.12)),
    );
    if (possible.length === 1) return { status: 'possible_match', identity: possible[0].identity };
    return { status: possible.length > 1 ? 'ambiguous' : 'unresolved', identity: null };
  };
}

export function matchBlackBookIdentity(
  sourceName: string,
  identities: BlackBookIdentity[],
): MatchResult {
  return createBlackBookIdentityMatcher(identities)(sourceName);
}
