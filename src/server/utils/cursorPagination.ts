const CURSOR_PREFIX = 'c:';

export interface CursorSortColumn {
  alias: string;
  typeCast: string;
}

export interface CursorSortConfig {
  columns: CursorSortColumn[];
}

const cursorSortConfigs: Record<string, CursorSortConfig> = {
  red_flag: {
    columns: [
      { alias: 'r', typeCast: '::int' },
      { alias: 'd', typeCast: '::timestamp' },
      { alias: 'i', typeCast: '::int' },
    ],
  },
  date: {
    columns: [
      { alias: 'd', typeCast: '::timestamp' },
      { alias: 'r', typeCast: '::int' },
      { alias: 'i', typeCast: '::int' },
    ],
  },
  title: {
    columns: [
      { alias: 't', typeCast: '::text' },
      { alias: 'd', typeCast: '::timestamp' },
      { alias: 'i', typeCast: '::int' },
    ],
  },
  fileType: {
    columns: [
      { alias: 'f', typeCast: '::text' },
      { alias: 't', typeCast: '::text' },
      { alias: 'i', typeCast: '::int' },
    ],
  },
  size: {
    columns: [
      { alias: 's', typeCast: '::bigint' },
      { alias: 'd', typeCast: '::timestamp' },
      { alias: 'i', typeCast: '::int' },
    ],
  },
  significance: {
    columns: [
      { alias: 'sg', typeCast: '::int' },
      { alias: 'r', typeCast: '::int' },
      { alias: 'd', typeCast: '::timestamp' },
      { alias: 'i', typeCast: '::int' },
    ],
  },
  relevance: {
    columns: [
      { alias: 'rk', typeCast: '::float4' },
      { alias: 'r', typeCast: '::int' },
      { alias: 'd', typeCast: '::timestamp' },
      { alias: 'i', typeCast: '::int' },
    ],
  },
};

export const getCursorSortConfig = (sortBy: string): CursorSortConfig | null => {
  return cursorSortConfigs[sortBy] ?? null;
};

export const encodeCursor = (values: Record<string, string | number | null>): string => {
  const raw = Object.entries(values)
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

export const buildCursorWhereClause = (
  cursor: string,
  sortConfig: CursorSortConfig,
  sortOrder: 'ASC' | 'DESC',
  paramIndexStart: number,
  sqlExpressions: string[],
): { clause: string; values: unknown[] } | null => {
  const parsed = decodeCursor(cursor);
  if (!parsed) return null;

  const values: unknown[] = [];
  const parts: string[] = [];

  const op = sortOrder === 'DESC' ? '<' : '>';

  const cursorValues: string[] = [];
  for (const col of sortConfig.columns) {
    const v = parsed[col.alias];
    if (v === undefined || v === '') return null;
    cursorValues.push(v);
  }

  for (let i = 0; i < cursorValues.length; i++) {
    const conditions: string[] = [];
    for (let j = 0; j <= i; j++) {
      const col = sortConfig.columns[j];
      const expr = sqlExpressions[j];
      const paramIdx = paramIndexStart + j;
      if (j < i) {
        conditions.push(`${expr} = $${paramIdx}${col.typeCast}`);
      } else {
        conditions.push(`${expr} ${op} $${paramIdx}${col.typeCast}`);
      }
    }
    parts.push(`(${conditions.join(' AND ')})`);
    values.push(parseValue(cursorValues[i]));
  }

  return { clause: parts.join(' OR '), values };
};

const parseValue = (value: string): string | number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : value;
};
