const HONORIFIC_PREFIXES = [
  'mr',
  'mrs',
  'ms',
  'miss',
  'dr',
  'prof',
  'professor',
  'president',
  'prime minister',
  'pm',
  'governor',
  'gov',
  'senator',
  'sen',
  'rep',
  'representative',
  'judge',
  'justice',
  'secretary',
  'sir',
  'lady',
  'lord',
  'hrh',
];

const WRAPPER_PREFIXES = [
  'to',
  'from',
  'cc',
  'bcc',
  're',
  'fwd',
  'fw',
  'subject',
  'dear',
  'dearest',
  'defendant',
  'defendants',
  'plaintiff',
  'plaintiffs',
  'watch',
  'watching',
  'philanthropy',
  'attn',
  'attention',
  'regarding',
  'about',
  'did',
];

const WRAPPER_SUFFIXES = ['to', 'from', 'cc', 'bcc'];

export function normalizeEntityNameToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,'"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripEntityHonorificPrefix(value: string): string {
  let current = normalizeEntityNameToken(value);
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of HONORIFIC_PREFIXES) {
      if (current === prefix) continue;
      if (current.startsWith(`${prefix} `)) {
        current = current.slice(prefix.length + 1).trim();
        changed = true;
        break;
      }
    }
  }
  return current;
}

function collapseRepeatedTokens(value: string): string {
  const tokens = normalizeEntityNameToken(value).split(' ').filter(Boolean);
  if (tokens.length < 2) return normalizeEntityNameToken(value);

  const collapsed: string[] = [];
  for (const token of tokens) {
    if (collapsed[collapsed.length - 1] !== token) collapsed.push(token);
  }
  return collapsed.join(' ');
}

export function unwrapEntityNameCandidates(value: string): string[] {
  const seen = new Set<string>();
  const queue = [stripEntityHonorificPrefix(value)];

  while (queue.length > 0) {
    const current = collapseRepeatedTokens(queue.shift() || '');
    if (!current || seen.has(current)) continue;
    seen.add(current);

    for (const prefix of WRAPPER_PREFIXES) {
      if (current.startsWith(`${prefix} `)) {
        queue.push(current.slice(prefix.length + 1));
      }
    }

    for (const suffix of WRAPPER_SUFFIXES) {
      if (current.endsWith(` ${suffix}`)) {
        queue.push(current.slice(0, -(suffix.length + 1)));
      }
    }

    const tokens = current.split(' ').filter(Boolean);
    if (tokens.length === 2) {
      queue.push(`${tokens[1]} ${tokens[0]}`);
    }
    if (tokens.length >= 3) {
      for (let start = 0; start < tokens.length; start++) {
        for (let size = 2; size <= Math.min(4, tokens.length - start); size++) {
          queue.push(tokens.slice(start, start + size).join(' '));
        }
      }
      queue.push(tokens.slice(1).join(' '));
      queue.push(tokens.slice(0, -1).join(' '));
    }
  }

  return Array.from(seen);
}
