const CURSOR_PREFIX = 'c:';

export const encodeCursor = (keys: Record<string, string | number | null>): string => {
  const raw = Object.entries(keys)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v ?? ''}`)
    .join('|');
  return CURSOR_PREFIX + Buffer.from(raw, 'utf8').toString('base64url');
};

export const decodeCursor = (cursor: string): Record<string, string> | null => {
  try {
    const stripped = cursor.startsWith(CURSOR_PREFIX) ? cursor.slice(CURSOR_PREFIX.length) : cursor;
    const decoded = Buffer.from(stripped, 'base64url').toString('utf8');
    const parts = decoded.split('|');
    const result: Record<string, string> = {};
    for (const part of parts) {
      const eqIdx = part.indexOf('=');
      if (eqIdx === -1) return null;
      result[part.slice(0, eqIdx)] = part.slice(eqIdx + 1);
    }
    return result;
  } catch {
    return null;
  }
};
