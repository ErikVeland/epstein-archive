import { entitiesQueries } from '@epstein/db';
import { Person, SearchFilters, SortOption } from '../../types.js';
import type { SubjectCardListItemDto } from '@shared/dto/entities';
import { getApiPool } from './connection.js';

export interface EntityRepositoryResult {
  entities: any[];
  total: number;
}

export interface SubjectCardRepositoryResult {
  subjects: SubjectCardListItemDto[];
  total: number;
}

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
  ['sir mick jagger', 'Mick Jagger'],
]);

const VIP_TITLE_PREFIXES = [
  'mr',
  'mrs',
  'ms',
  'miss',
  'dr',
  'prof',
  'professor',
  'president',
  'prime minister',
  'governor',
  'senator',
  'judge',
  'justice',
  'secretary',
];

const VIP_LOOKUP_TTL_MS = 5 * 60 * 1000;
let vipLookupCache: { value: Map<string, string>; expiresAt: number } | null = null;

function normalizeVipDisplayName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,'"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripVipTitlePrefix(value: string): string {
  let current = value;
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of VIP_TITLE_PREFIXES) {
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

function upsertVipAlias(
  map: Map<string, { canonicalName: string; score: number }>,
  alias: string,
  canonicalName: string,
  score: number,
): void {
  const key = normalizeVipDisplayName(alias);
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

async function buildVipDisplayLookup(): Promise<Map<string, string>> {
  const now = Date.now();
  if (vipLookupCache && vipLookupCache.expiresAt > now) {
    return vipLookupCache.value;
  }

  const raw = await (entitiesQueries.getVipEntities as any).run(undefined, getApiPool());
  const bestByAlias = new Map<string, { canonicalName: string; score: number }>();

  for (const row of raw) {
    const canonicalName = row.full_name!.trim();
    const score = Number(row.mentions || 0);
    upsertVipAlias(bestByAlias, canonicalName, canonicalName, score);

    const stripped = stripVipTitlePrefix(normalizeVipDisplayName(canonicalName));
    if (stripped) upsertVipAlias(bestByAlias, stripped, canonicalName, score);

    for (const alias of String(row.aliases || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)) {
      upsertVipAlias(bestByAlias, alias, canonicalName, score);
      const aliasStripped = stripVipTitlePrefix(normalizeVipDisplayName(alias));
      if (aliasStripped) upsertVipAlias(bestByAlias, aliasStripped, canonicalName, score);
    }
  }

  const lookup = new Map(Array.from(bestByAlias.entries()).map(([k, v]) => [k, v.canonicalName]));
  vipLookupCache = {
    value: lookup,
    expiresAt: now + VIP_LOOKUP_TTL_MS,
  };
  return lookup;
}

function resolveDisplayName(name: string, lookup: Map<string, string>): string {
  const trimmed = name.trim();
  if (!trimmed) return name;

  const normalized = normalizeVipDisplayName(trimmed);
  const stripped = stripVipTitlePrefix(normalized);
  const direct =
    VIP_DISPLAY_FALLBACKS.get(normalized) ||
    VIP_DISPLAY_FALLBACKS.get(stripped) ||
    lookup.get(normalized) ||
    lookup.get(stripped);
  if (direct) return direct;

  const tokens = stripped.split(' ').filter(Boolean);
  if (tokens.length === 2) {
    const reversed = `${tokens[1]} ${tokens[0]}`;
    const reverseHit = VIP_DISPLAY_FALLBACKS.get(reversed) || lookup.get(reversed);
    if (reverseHit) return reverseHit;
  }

  return trimmed;
}

function normalizeSubjectDedupeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(to|from|cc|bcc|subject|re|fwd|fw|of)\b[:\s-]*/g, '')
    .replace(/\b(to|from|cc|bcc|subject|re|fwd|fw)\b\s*$/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(
      /\b(mr|mrs|ms|miss|dr|prof|professor|president|prime|minster|governor|senator|judge|justice|secretary)\b/g,
      '',
    )
    .replace(/\b(the|of|and|or|inc|llc|corp|ltd|group|trust)\b/g, '')
    .replace(/\b[a-z]\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSubjectKeySql(columnSql: string): string {
  return `
    TRIM(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(LOWER(COALESCE(${columnSql}, '')), '\\m(to|from|cc|bcc|subject|re|fwd|fw)\\M\\s*$', ' ', 'gi'),
              '[^a-z0-9\\s]',
              ' ',
              'g'
            ),
            '\\m(mr|mrs|ms|miss|dr|prof|professor|president|prime|minster|governor|senator|judge|justice|secretary)\\M',
            ' ',
            'gi'
          ),
          '\\m(the|of|and|or|inc|llc|corp|ltd|group|trust|[a-z])\\M',
          ' ',
          'gi'
        ),
        '\\s+',
        ' ',
        'g'
      )
    )
  `;
}

function isLikelyInferredEntity(name: string, _role?: string): boolean {
  const n = String(name || '')
    .toLowerCase()
    .trim();

  if (!n) return false;
  if (/^(to|from|cc|bcc|subject|re|fwd|fw|of)\b[:\s-]*/.test(n)) return true;
  if (/\b(to|from|cc|bcc|subject|re|fwd|fw)\s*$/.test(n)) return true;
  if (/\b(?:.+?)'s\s+(lawyer|assistant|aide|counsel|staff|pilot|masseuse)\b/.test(n)) return true;
  if (/^(lawyer|assistant|aide|counsel|staff|pilot|masseuse)\b\s+/.test(n)) return true;
  return false;
}

function inferredEntityPenalty(name: string, role?: string): number {
  const n = String(name || '')
    .toLowerCase()
    .trim();
  const r = String(role || '')
    .toLowerCase()
    .trim();

  let penalty = 0;
  if (isLikelyInferredEntity(n, r)) penalty += 4;
  if (/\b(to|from|cc|bcc|subject|re|fwd|fw)\s*$/.test(n)) penalty += 3;
  if (/^(to|from|cc|bcc|subject|re|fwd|fw|of)\b[:\s-]*/.test(n)) penalty += 3;
  if (/\b(?:.+?)'s\s+(lawyer|assistant|aide|counsel|staff|pilot|masseuse)\b/.test(n)) penalty += 2;
  if (/^(lawyer|assistant|aide|counsel|staff|pilot|masseuse)\b\s+/.test(n)) penalty += 2;
  return penalty;
}

const EVIDENCE_LADDER_RANK: Record<'NONE' | 'L3' | 'L2' | 'L1', number> = {
  NONE: 0,
  L3: 1,
  L2: 2,
  L1: 3,
};

async function getSubjectCardsFallback(
  page: number,
  limit: number,
  filters?: SearchFilters,
  sortBy?: SortOption,
): Promise<SubjectCardRepositoryResult> {
  const offset = (page - 1) * limit;
  const searchTerm = filters?.searchTerm ? `%${filters.searchTerm.trim()}%` : null;
  const riskLevels = filters?.likelihoodScore
    ? filters.likelihoodScore.map((s) => String(s).toUpperCase())
    : null;
  const role = filters?.role && filters.role !== 'all' ? filters.role : null;
  const minRedFlag =
    typeof filters?.minRedFlagIndex === 'number' ? Number(filters.minRedFlagIndex) : null;
  const maxRedFlag =
    typeof filters?.maxRedFlagIndex === 'number' ? Number(filters.maxRedFlagIndex) : null;
  const sortKey = String(sortBy || 'red_flag')
    .toLowerCase()
    .replace(/-/g, '_');
  const pgSort = sortKey === 'name' || sortKey === 'recent' ? sortKey : null;

  const pool = getApiPool();
  const [rows, countRows, maxConnResult, vipDisplayLookup] = await Promise.all([
    (entitiesQueries.getSubjectCards as any).run(
      {
        searchTerm,
        riskLevels,
        minRedFlag,
        maxRedFlag,
        role,
        sortBy: pgSort,
        limit,
        offset,
      },
      pool,
    ),
    (entitiesQueries.countSubjectCards as any).run(
      {
        searchTerm,
        riskLevels,
      },
      pool,
    ),
    (entitiesQueries.getMaxConnectivity as any).run(undefined, pool),
    buildVipDisplayLookup(),
  ]);

  const maxConnectivityCount = Math.max(1, Number(maxConnResult?.[0]?.maxConn || 1));
  const subjects: SubjectCardListItemDto[] = (rows as any[]).map((row) => {
    const mentions = Number(row.mentions || 0);
    const mediaCount = Number(row.mediaCount || 0);
    const blackBookCount = Number(row.blackBookCount || 0);
    const connStr = String(row.connections || '');
    const connCount = /^\d+$/.test(connStr)
      ? parseInt(connStr, 10)
      : (connStr.match(/,/g) || []).length;

    let ladder: 'L1' | 'L2' | 'L3' | 'NONE' = 'L3';
    if (blackBookCount > 0 || mediaCount > 0) ladder = 'L1';
    else if (mentions > 50) ladder = 'L2';
    else if (mentions === 0) ladder = 'NONE';

    const drivers: string[] = [];
    if (blackBookCount > 0) drivers.push('Black Book');
    if (mediaCount > 0) drivers.push('Media Mentions');

    return {
      id: String(row.id),
      name: resolveDisplayName(String(row.fullName || 'Unknown'), vipDisplayLookup),
      role: String(row.primaryRole || 'Unknown'),
      shortBio: row.bio || undefined,
      stats: {
        mentions,
        documents: 0,
        distinctSources: 0,
        verifiedMedia: mediaCount,
      },
      forensics: {
        riskLevel: String(row.riskLevel || 'LOW').toUpperCase(),
        evidenceLadder: ladder,
        redFlagObjective: Number(row.redFlagRating || 0),
        redFlagSubjective: Number(row.redFlagRating || 0),
        signalStrength: {
          exposure: Math.min(100, (Math.log10(mentions + 1) / 3) * 100),
          connectivity: Math.min(100, (connCount / maxConnectivityCount) * 100),
          corroboration: Math.min(100, mediaCount * 20),
        },
        driverLabels: drivers,
      },
      topPreview: undefined,
      ...(row.topPhotoId ? ({ topPhotoId: String(row.topPhotoId) } as any) : {}),
    };
  });

  return {
    subjects,
    total: Number(countRows?.[0]?.total || 0),
  };
}

export const entitiesRepository = {
  getSubjectCards: async (
    page: number = 1,
    limit: number = 24,
    filters?: SearchFilters,
    sortBy?: SortOption,
  ): Promise<SubjectCardRepositoryResult> => {
    const offset = (page - 1) * limit;
    const searchTerm = filters?.searchTerm ? `%${filters.searchTerm.trim()}%` : null;
    const riskLevels = filters?.likelihoodScore
      ? filters.likelihoodScore.map((s) => String(s).toUpperCase())
      : null;
    const sortOrder: 'ASC' | 'DESC' = filters?.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const pool = getApiPool();
    const whereParts: string[] = [];
    const params: Array<string | number | string[] | null> = [];
    const addParam = (value: string | number | string[] | null) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (searchTerm) {
      const p = addParam(searchTerm);
      whereParts.push(
        `(e.full_name ILIKE ${p} OR e.primary_role ILIKE ${p} OR COALESCE(e.aliases, '') ILIKE ${p})`,
      );
    }
    if (riskLevels && riskLevels.length > 0) {
      const p = addParam(riskLevels);
      whereParts.push(`e.riskLevel = ANY(${p}::text[])`);
    }
    if (filters?.minRedFlagIndex !== undefined) {
      const p = addParam(filters.minRedFlagIndex);
      whereParts.push(`COALESCE(e.red_flag_rating, 0) >= ${p}`);
    }
    if (filters?.maxRedFlagIndex !== undefined) {
      const p = addParam(filters.maxRedFlagIndex);
      whereParts.push(`COALESCE(e.red_flag_rating, 0) <= ${p}`);
    }
    if (filters?.role && filters.role !== 'all') {
      const p = addParam(filters.role);
      whereParts.push(`e.primary_role = ${p}`);
    }
    if (filters?.entityType && filters.entityType !== 'all') {
      const p = addParam(filters.entityType);
      whereParts.push(`COALESCE(e.entity_type, 'Person') = ${p}`);
    }

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    const riskRankExpr = `CASE UPPER(COALESCE(e.riskLevel, 'LOW')) WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 1 ELSE 0 END`;
    const inferredRankExpr = `CASE
      WHEN LOWER(COALESCE(e.full_name, '')) ~* '^(to|from|cc|bcc|subject|re|fwd|fw|of)\\b[:\\s-]*'
        OR LOWER(COALESCE(e.full_name, '')) ~* '\\m(to|from|cc|bcc|subject|re|fwd|fw)\\M\\s*$'
        OR LOWER(COALESCE(e.full_name, '')) ~* '\\m.+''s\\M\\s+(lawyer|assistant|aide|counsel|staff|pilot|masseuse)\\M'
        OR LOWER(COALESCE(e.full_name, '')) ~* '^(lawyer|assistant|aide|counsel|staff|pilot|masseuse)\\b\\s+'
      THEN 1 ELSE 0 END`;
    const ALLOWED_SORT_KEYS = new Set([
      'red_flag',
      'rfi',
      'default',
      'risk',
      'mentions',
      'document_count',
      'document-count',
      'recent',
      'name',
    ]);
    const sortKeyRaw = String(sortBy || 'red_flag')
      .toLowerCase()
      .replace(/-/g, '_');
    const sortKey = ALLOWED_SORT_KEYS.has(sortKeyRaw) ? sortKeyRaw : 'red_flag';

    const orderByTerms: string[] = [];
    orderByTerms.push(`${inferredRankExpr} ASC`);

    if (sortKey === 'red_flag' || sortKey === 'rfi' || sortKey === 'default') {
      // Canonical ordering for subject cards:
      // Red Flag Index -> Risk Level -> Mentions
      orderByTerms.push(
        `COALESCE(e.red_flag_rating, 0) ${sortOrder}`,
        `${riskRankExpr} ${sortOrder}`,
        `COALESCE(mc.mentions, 0) ${sortOrder}`,
      );
    } else if (sortKey === 'risk') {
      orderByTerms.push(
        `${riskRankExpr} ${sortOrder}`,
        `COALESCE(e.red_flag_rating, 0) ${sortOrder}`,
        `COALESCE(mc.mentions, 0) ${sortOrder}`,
      );
    } else if (sortKey === 'mentions') {
      orderByTerms.push(
        `COALESCE(mc.mentions, 0) ${sortOrder}`,
        `COALESCE(e.red_flag_rating, 0) DESC`,
        `${riskRankExpr} DESC`,
      );
    } else if (sortKey === 'document_count' || sortKey === 'document-count') {
      orderByTerms.push(
        `COALESCE(mc.documents, 0) ${sortOrder}`,
        `COALESCE(e.red_flag_rating, 0) DESC`,
        `${riskRankExpr} DESC`,
        `COALESCE(mc.mentions, 0) DESC`,
      );
    } else if (sortKey === 'recent') {
      orderByTerms.push(
        `e.id ${sortOrder}`,
        `COALESCE(e.red_flag_rating, 0) DESC`,
        `${riskRankExpr} DESC`,
        `COALESCE(mc.mentions, 0) DESC`,
      );
    } else {
      orderByTerms.push(`LOWER(COALESCE(e.full_name, '')) ${sortOrder}`);
    }

    orderByTerms.push(`COALESCE(e.is_vip, 0) DESC`, `LOWER(COALESCE(e.full_name, '')) ASC`);
    const orderBySql = orderByTerms.join(', ');

    const listParams = [...params, limit, offset];

    try {
      // Run main query, count, max-connectivity, and VIP lookup in parallel
      const [rawEntitiesResult, countResult, maxConnResult, vipDisplayLookup] = await Promise.all([
        pool.query(
          `
          WITH mention_counts AS (
            SELECT
              em.entity_id,
              COUNT(*)::bigint AS mentions,
              COUNT(DISTINCT em.document_id)::bigint AS documents
            FROM entity_mentions em
            GROUP BY em.entity_id
          )
          SELECT
            e.id,
            e.full_name as "fullName",
            e.primary_role as "primaryRole",
            e.bio,
            COALESCE(mc.mentions, COALESCE(e.mentions, 0)) as mentions,
            e.riskLevel as "riskLevel",
            e.red_flag_rating as "redFlagRating",
            e.connections_summary as "connections",
            e.was_agentic as "wasAgentic",
            (
              SELECT COUNT(*)
              FROM entity_mentions em2
              JOIN documents d ON d.id = em2.document_id
              WHERE em2.entity_id = e.id
                AND d.evidence_type = 'media'
            ) as "mediaCount",
            (SELECT COUNT(*) FROM black_book_entries WHERE person_id = e.id) as "blackBookCount",
            (
              SELECT m.id
              FROM media_items m
              LEFT JOIN media_item_people mip ON m.id = mip.media_item_id::text
              LEFT JOIN media_albums ma ON ma.id = m.album_id
              WHERE (
                COALESCE(mip.entity_id, m.entity_id) = e.id
                OR LOWER(COALESCE(ma.name, '')) = LOWER(COALESCE(e.full_name, ''))
                OR EXISTS (
                  SELECT 1
                  FROM unnest(regexp_split_to_array(LOWER(COALESCE(e.aliases, '')), '\\s*,\\s*')) alias_name
                  WHERE alias_name <> ''
                    AND alias_name = LOWER(COALESCE(ma.name, ''))
                )
              )
                AND (m.file_type ILIKE 'image/%' OR m.file_type IS NULL)
              ORDER BY COALESCE(m.red_flag_rating, 0) DESC, m.id DESC
              LIMIT 1
            ) as "topPhotoId"
          FROM entities e
          LEFT JOIN mention_counts mc ON mc.entity_id = e.id
          ${whereSql}
          ORDER BY ${orderBySql}
          LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
          `,
          listParams,
        ),
        pool.query<{ total: string }>(
          `
          SELECT COUNT(*)::bigint AS total
          FROM entities e
          ${whereSql}
          `,
          params,
        ),
        (entitiesQueries.getMaxConnectivity as any).run(undefined, pool),
        buildVipDisplayLookup(),
      ]);

      const rawEntities = rawEntitiesResult.rows as any[];
      const total = Number(countResult.rows[0]?.total || 0);
      const maxConnectivityCount = Number(maxConnResult[0]?.maxConn || 1);

      const pageNormalizedKeys = Array.from(
        new Set(
          rawEntities
            .map((row) => resolveDisplayName(String(row.fullName || ''), vipDisplayLookup))
            .map((name) => normalizeSubjectDedupeKey(name))
            .filter(Boolean),
        ),
      );

      let entitiesForPageMerge = rawEntities;
      if (pageNormalizedKeys.length > 0) {
        const supplementalParams = [...params];
        const keysParam = `$${supplementalParams.length + 1}`;
        supplementalParams.push(pageNormalizedKeys);

        const whereWithKeysSql = whereParts.length
          ? `WHERE ${whereParts.join(' AND ')} AND ${normalizeSubjectKeySql('e.full_name')} = ANY(${keysParam}::text[])`
          : `WHERE ${normalizeSubjectKeySql('e.full_name')} = ANY(${keysParam}::text[])`;

        const supplementalResult = await pool.query(
          `
          WITH mention_counts AS (
            SELECT
              em.entity_id,
              COUNT(*)::bigint AS mentions,
              COUNT(DISTINCT em.document_id)::bigint AS documents
            FROM entity_mentions em
            GROUP BY em.entity_id
          )
          SELECT
            e.id,
            e.full_name as "fullName",
            e.primary_role as "primaryRole",
            e.bio,
            COALESCE(mc.mentions, COALESCE(e.mentions, 0)) as mentions,
            e.riskLevel as "riskLevel",
            e.red_flag_rating as "redFlagRating",
            e.connections_summary as "connections",
            e.was_agentic as "wasAgentic",
          (
              SELECT COUNT(*)
              FROM entity_mentions em2
              JOIN documents d ON d.id = em2.document_id
              WHERE em2.entity_id = e.id
                AND d.evidence_type = 'media'
            ) as "mediaCount",
            (SELECT COUNT(*) FROM black_book_entries WHERE person_id = e.id) as "blackBookCount",
            (
              SELECT m.id
              FROM media_items m
              LEFT JOIN media_item_people mip ON m.id = mip.media_item_id::text
              LEFT JOIN media_albums ma ON ma.id = m.album_id
              WHERE (
                COALESCE(mip.entity_id, m.entity_id) = e.id
                OR LOWER(COALESCE(ma.name, '')) = LOWER(COALESCE(e.full_name, ''))
                OR EXISTS (
                  SELECT 1
                  FROM unnest(regexp_split_to_array(LOWER(COALESCE(e.aliases, '')), '\\s*,\\s*')) alias_name
                  WHERE alias_name <> ''
                    AND alias_name = LOWER(COALESCE(ma.name, ''))
                )
              )
                AND (m.file_type ILIKE 'image/%' OR m.file_type IS NULL)
              ORDER BY COALESCE(m.red_flag_rating, 0) DESC, m.id DESC
              LIMIT 1
            ) as "topPhotoId"
          FROM entities e
          LEFT JOIN mention_counts mc ON mc.entity_id = e.id
          ${whereWithKeysSql}
          `,
          supplementalParams,
        );

        const byId = new Map<string, any>();
        for (const row of [...rawEntities, ...supplementalResult.rows]) {
          byId.set(String(row.id), row);
        }
        entitiesForPageMerge = Array.from(byId.values());
      }

      const subjectIds = entitiesForPageMerge
        .map((row) => Number(row.id))
        .filter((id) => Number.isFinite(id) && id > 0);

      const aggregateStatsByEntity = new Map<
        number,
        { documents: number; distinctSources: number; verifiedMedia: number }
      >();
      if (subjectIds.length > 0) {
        const aggregateResult = await pool.query<{
          entity_id: number;
          documents: string | number;
          distinct_sources: string | number;
          verified_media: string | number;
        }>(
          `
          SELECT
            em.entity_id,
            COUNT(DISTINCT em.document_id) AS documents,
            COUNT(
              DISTINCT CASE
                WHEN NULLIF(BTRIM(COALESCE(d.evidence_type, '')), '') IS NOT NULL THEN LOWER(BTRIM(d.evidence_type))
                WHEN d.file_type ILIKE 'image/%'
                  OR d.file_type ILIKE 'video/%'
                  OR d.file_type ILIKE 'audio/%' THEN 'media'
                WHEN LOWER(COALESCE(d.file_name, '')) LIKE '%.eml'
                  OR LOWER(COALESCE(d.file_name, '')) LIKE '%.msg'
                  OR LOWER(COALESCE(d.file_path, '')) LIKE '%/email%'
                  OR LOWER(COALESCE(d.file_path, '')) LIKE '%/emails%' THEN 'email'
                WHEN LOWER(COALESCE(d.file_path, '')) LIKE '%black%book%' THEN 'black_book'
                WHEN LOWER(COALESCE(d.file_path, '')) LIKE '%flight%' THEN 'flight'
                WHEN LOWER(COALESCE(d.file_name, '')) LIKE '%.pdf'
                  OR LOWER(COALESCE(d.file_name, '')) LIKE '%.txt'
                  OR LOWER(COALESCE(d.file_name, '')) LIKE '%.doc'
                  OR LOWER(COALESCE(d.file_name, '')) LIKE '%.docx'
                  OR LOWER(COALESCE(d.file_name, '')) LIKE '%.xls'
                  OR LOWER(COALESCE(d.file_name, '')) LIKE '%.xlsx' THEN 'document'
                ELSE NULL
              END
            ) AS distinct_sources,
            COUNT(DISTINCT em.document_id) FILTER (
              WHERE d.evidence_type = 'media'
                AND (
                  d.file_type ILIKE 'image/%'
                  OR d.file_type ILIKE 'video/%'
                  OR d.file_type ILIKE 'audio/%'
                )
            ) AS verified_media
          FROM entity_mentions em
          JOIN documents d ON d.id = em.document_id
          WHERE em.entity_id = ANY($1::bigint[])
          GROUP BY em.entity_id
        `,
          [subjectIds],
        );

        for (const row of aggregateResult.rows) {
          aggregateStatsByEntity.set(Number(row.entity_id), {
            documents: Number(row.documents || 0),
            distinctSources: Number(row.distinct_sources || 0),
            verifiedMedia: Number(row.verified_media || 0),
          });
        }
      }

      const subjects: SubjectCardListItemDto[] = entitiesForPageMerge.map((e) => {
        const entityId = Number(e.id || 0);
        const aggregateStats = aggregateStatsByEntity.get(entityId);
        const mentions = Number(e.mentions || 0);
        const mediaCount = Number(
          aggregateStats?.verifiedMedia ?? Number((e as any).mediaCount || 0),
        );
        const blackBookCount = Number((e as any).blackBookCount || 0);

        let ladder: 'L1' | 'L2' | 'L3' | 'NONE' = 'L3';
        if (blackBookCount > 0 || mediaCount > 0) ladder = 'L1';
        else if (mentions > 50) ladder = 'L2';
        else if (mentions === 0) ladder = 'NONE';

        const exposure = Math.min(100, (Math.log10(mentions + 1) / 3) * 100);

        let connCount = 0;
        const connStr = String(e.connections || '');
        if (/^\d+$/.test(connStr)) connCount = parseInt(connStr, 10);
        else connCount = (connStr.match(/,/g) || []).length;
        const connectivity = Math.min(100, (connCount / maxConnectivityCount) * 100);

        const drivers: string[] = [];
        if (blackBookCount > 0) drivers.push('Black Book');
        if (mediaCount > 0) drivers.push('Media Mentions');

        return {
          id: String(e.id),
          name: resolveDisplayName(e.fullName || 'Unknown', vipDisplayLookup),
          role: e.primaryRole || 'Unknown',
          shortBio: e.bio || undefined,
          stats: {
            mentions,
            documents: aggregateStats?.documents ?? 0,
            distinctSources: aggregateStats?.distinctSources ?? 0,
            verifiedMedia: mediaCount,
          },
          forensics: {
            riskLevel: String((e.riskLevel as any) || 'LOW').toUpperCase(),
            evidenceLadder: ladder,
            redFlagObjective: Number(e.redFlagRating || 0),
            redFlagSubjective: Number(e.redFlagRating || 0),
            signalStrength: {
              exposure,
              connectivity,
              corroboration: Math.min(100, mediaCount * 20),
            },
            driverLabels: drivers.slice(0, 4),
          },
          topPreview: undefined,
          ...((e as any).topPhotoId ? ({ topPhotoId: String((e as any).topPhotoId) } as any) : {}),
        };
      });

      const mergedByNormalizedName = new Map<
        string,
        SubjectCardListItemDto & { topPhotoId?: string }
      >();
      for (const subject of subjects) {
        const norm = normalizeSubjectDedupeKey(subject.name);
        if (!norm) continue;

        const existing = mergedByNormalizedName.get(norm);
        if (!existing) {
          mergedByNormalizedName.set(norm, { ...subject });
          continue;
        }

        const existingPenalty = inferredEntityPenalty(existing.name, existing.role);
        const incomingPenalty = inferredEntityPenalty(subject.name, subject.role);
        const preferIncoming =
          incomingPenalty < existingPenalty ||
          (incomingPenalty === existingPenalty &&
            (subject.stats.mentions > existing.stats.mentions ||
              (subject.stats.mentions === existing.stats.mentions &&
                (subject.stats.documents > existing.stats.documents ||
                  subject.stats.verifiedMedia > existing.stats.verifiedMedia))));

        const mergedDrivers = Array.from(
          new Set([
            ...(existing.forensics.driverLabels || []),
            ...(subject.forensics.driverLabels || []),
          ]),
        ).slice(0, 4);

        const mergedMentions =
          Number(existing.stats.mentions || 0) + Number(subject.stats.mentions || 0);
        const mergedDocuments =
          Number(existing.stats.documents || 0) + Number(subject.stats.documents || 0);
        const mergedVerifiedMedia =
          Number(existing.stats.verifiedMedia || 0) + Number(subject.stats.verifiedMedia || 0);

        const base = preferIncoming ? subject : existing;
        const other = preferIncoming ? existing : subject;

        const merged: SubjectCardListItemDto & { topPhotoId?: string } = {
          ...base,
          role:
            base.role && base.role !== 'Unknown'
              ? base.role
              : other.role && other.role !== 'Unknown'
                ? other.role
                : base.role,
          shortBio: base.shortBio || other.shortBio,
          stats: {
            mentions: mergedMentions,
            documents: mergedDocuments,
            distinctSources: Math.max(
              Number(existing.stats.distinctSources || 0),
              Number(subject.stats.distinctSources || 0),
            ),
            verifiedMedia: mergedVerifiedMedia,
          },
          forensics: {
            ...base.forensics,
            riskLevel:
              Number(subject.forensics.redFlagObjective || 0) >
              Number(existing.forensics.redFlagObjective || 0)
                ? subject.forensics.riskLevel
                : existing.forensics.riskLevel,
            evidenceLadder:
              EVIDENCE_LADDER_RANK[
                subject.forensics.evidenceLadder as 'NONE' | 'L3' | 'L2' | 'L1'
              ] >
              EVIDENCE_LADDER_RANK[existing.forensics.evidenceLadder as 'NONE' | 'L3' | 'L2' | 'L1']
                ? subject.forensics.evidenceLadder
                : existing.forensics.evidenceLadder,
            redFlagObjective: Math.max(
              Number(existing.forensics.redFlagObjective || 0),
              Number(subject.forensics.redFlagObjective || 0),
            ),
            redFlagSubjective: Math.max(
              Number(existing.forensics.redFlagSubjective || 0),
              Number(subject.forensics.redFlagSubjective || 0),
            ),
            signalStrength: {
              exposure: Math.min(100, (Math.log10(mergedMentions + 1) / 3) * 100),
              connectivity: Math.max(
                Number(existing.forensics.signalStrength?.connectivity || 0),
                Number(subject.forensics.signalStrength?.connectivity || 0),
              ),
              corroboration: Math.min(100, mergedVerifiedMedia * 20),
            },
            driverLabels: mergedDrivers,
          },
          topPhotoId: (base as any).topPhotoId || (other as any).topPhotoId,
        };

        mergedByNormalizedName.set(norm, merged);
      }

      const riskRank = (value: string | undefined): number => {
        const level = String(value || 'LOW').toUpperCase();
        if (level === 'HIGH') return 3;
        if (level === 'MEDIUM') return 2;
        return 1;
      };
      const dir = sortOrder === 'ASC' ? 1 : -1;
      const normalizedSubjects = Array.from(mergedByNormalizedName.values()).sort((a, b) => {
        const aRfi = Number(a.forensics.redFlagObjective || a.forensics.redFlagSubjective || 0);
        const bRfi = Number(b.forensics.redFlagObjective || b.forensics.redFlagSubjective || 0);
        const aRisk = riskRank(a.forensics.riskLevel);
        const bRisk = riskRank(b.forensics.riskLevel);
        const aMentions = Number(a.stats.mentions || 0);
        const bMentions = Number(b.stats.mentions || 0);
        const aDocs = Number(a.stats.documents || 0);
        const bDocs = Number(b.stats.documents || 0);
        const aPenalty = inferredEntityPenalty(a.name, a.role);
        const bPenalty = inferredEntityPenalty(b.name, b.role);
        const aInferred = isLikelyInferredEntity(a.name, a.role);
        const bInferred = isLikelyInferredEntity(b.name, b.role);

        if (aInferred !== bInferred) return aInferred ? 1 : -1;

        if (sortKey === 'red_flag' || sortKey === 'rfi' || sortKey === 'default') {
          if (aRfi !== bRfi) return (aRfi - bRfi) * dir;
          if (aRisk !== bRisk) return (aRisk - bRisk) * dir;
          if (aPenalty !== bPenalty) return aPenalty - bPenalty;
          if (aMentions !== bMentions) return (aMentions - bMentions) * dir;
        } else if (sortKey === 'risk') {
          if (aRisk !== bRisk) return (aRisk - bRisk) * dir;
          if (aRfi !== bRfi) return (aRfi - bRfi) * dir;
          if (aPenalty !== bPenalty) return aPenalty - bPenalty;
          if (aMentions !== bMentions) return (aMentions - bMentions) * dir;
        } else if (sortKey === 'mentions') {
          if (aMentions !== bMentions) return (aMentions - bMentions) * dir;
          if (aPenalty !== bPenalty) return aPenalty - bPenalty;
          if (aRfi !== bRfi) return bRfi - aRfi;
          if (aRisk !== bRisk) return bRisk - aRisk;
        } else if (sortKey === 'document_count' || sortKey === 'document-count') {
          if (aDocs !== bDocs) return (aDocs - bDocs) * dir;
          if (aPenalty !== bPenalty) return aPenalty - bPenalty;
          if (aRfi !== bRfi) return bRfi - aRfi;
          if (aRisk !== bRisk) return bRisk - aRisk;
          if (aMentions !== bMentions) return bMentions - aMentions;
        }

        const vipCmp = Number((b as any).isVip || 0) - Number((a as any).isVip || 0);
        if (vipCmp !== 0) return vipCmp;
        return a.name.localeCompare(b.name);
      });

      return {
        subjects: normalizedSubjects,
        total,
      };
    } catch (error: any) {
      const message = String(error?.message || '');
      const isStatementTimeout = error?.code === '57014' || /statement timeout/i.test(message);
      if (!isStatementTimeout) throw error;
      return getSubjectCardsFallback(page, limit, filters, sortBy);
    }
  },

  startBackgroundJunkBackfill: () => {
    /* No-op in Postgres version */
  },

  backfillJunkFlags: () => {
    /* No-op in Postgres version */
  },

  getEntities: async (
    page: number = 1,
    limit: number = 24,
    filters?: SearchFilters,
    sortBy?: SortOption,
  ): Promise<EntityRepositoryResult> => {
    const result = await entitiesRepository.getSubjectCards(page, limit, filters, sortBy);

    const normalizedEntities = result.subjects.map((subject) => {
      const redFlag = Number(
        subject.forensics.redFlagObjective ?? subject.forensics.redFlagSubjective ?? 0,
      );
      return {
        id: String(subject.id),
        fullName: subject.name || 'Unknown',
        primaryRole: subject.role || 'Unknown',
        mentions: Number(subject.stats.mentions || 0),
        documentCount: Number(subject.stats.documents || 0),
        distinctSources: Number(subject.stats.distinctSources || 0),
        verifiedMedia: Number(subject.stats.verifiedMedia || 0),
        riskLevel: String(subject.forensics.riskLevel || 'LOW').toUpperCase(),
        redFlagRating: redFlag,
        bio: subject.shortBio || '',
        topPhotoId: (subject as any).topPhotoId || undefined,
      };
    });

    return {
      entities: normalizedEntities as any,
      total: Number(result.total || 0),
    };
  },

  getAllEntities: async (limit: number = 0): Promise<any[]> => {
    const rows = await (entitiesQueries.getSubjectCards as any).run(
      {
        searchTerm: null,
        riskLevels: null,
        minRedFlag: null,
        maxRedFlag: null,
        role: null,
        sortBy: 'name',
        limit: limit > 0 ? limit : 1000,
        offset: 0,
      },
      getApiPool(),
    );
    return rows;
  },

  getEntityById: async (id: string | number): Promise<Person | null> => {
    const entityId = Number(id);
    const rows = await (entitiesQueries.getEntityById as any).run({ id: entityId }, getApiPool());
    const entity = rows[0];

    if (!entity) return null;

    const mentions = await (entitiesQueries.getEntityMentions as any).run(
      { entityId, limit: 100 },
      getApiPool(),
    );
    const relationships = await (entitiesQueries.getEntityRelationships as any).run(
      { entityId },
      getApiPool(),
    );

    const vipDisplayLookup = await buildVipDisplayLookup();

    return {
      ...entity,
      id: String(entity.id),
      fullName: entity.full_name || '',
      displayName: resolveDisplayName(entity.full_name || '', vipDisplayLookup),
      primaryRole: entity.primary_role || 'Unknown',
      mentions: Number(entity.mentions || 0),
      redFlagRating: Number(entity.red_flag_rating || 0),
      isVip: Boolean(entity.is_vip),
      wasAgentic: Boolean(entity.was_agentic),
      fileReferences: mentions.map((m: any) => ({
        id: String(m.document_id),
        fileName: m.documentTitle,
        dateCreated: m.documentDate,
      })),
      significant_passages: mentions.slice(0, 5).map((m: any) => ({
        passage: m.mention_context || '',
        keyword: m.surface_text || '',
        filename: m.documentTitle || 'Document',
        documentId: String(m.document_id),
      })),
      relationships: relationships.map((r: any) => ({
        targetId: String(r.target_entity_id),
        targetName: r.targetName,
        targetRole: r.targetRole,
        type: r.relationship_type,
        confidence: Number(r.confidence || 0),
      })),
    } as any;
  },

  getEntitySummarySource: async (entityId: number | string, topN: number = 10): Promise<any> => {
    const id = Number(entityId);
    const rows = await (entitiesQueries.getEntityById as any).run({ id: id }, getApiPool());
    const entity = rows[0];

    if (!entity) return null;

    const relationships = await (entitiesQueries.getEntityRelationships as any).run(
      { entityId: id },
      getApiPool(),
    );
    const mentions = await (entitiesQueries.getEntityMentions as any).run(
      { entityId: id, limit: topN },
      getApiPool(),
    );

    return {
      entity: {
        ...entity,
        id: String(entity.id),
      },
      relationships: relationships.slice(0, topN).map((r: any) => ({
        targetId: String(r.target_entity_id),
        targetName: r.targetName,
        type: r.relationship_type,
        confidence: Number(r.confidence || 0),
      })),
      documents: mentions.map((m: any) => ({
        id: String(m.document_id),
        title: m.documentTitle,
        date: m.documentDate,
      })),
    };
  },

  getEntityDocuments: async (entityId: string): Promise<any[]> => {
    const id = Number(entityId);
    const mentions = await (entitiesQueries.getEntityMentions as any).run(
      { entityId: id, limit: 1000 },
      getApiPool(),
    );
    return mentions.map((m: any) => ({
      id: String(m.document_id),
      title: m.documentTitle,
      dateCreated: m.documentDate,
    }));
  },

  getEntityDocumentCount: async (entityId: string): Promise<number> => {
    const id = Number(entityId);
    const pool = getApiPool();
    const result = await pool.query(
      'SELECT COUNT(*)::int AS total FROM entity_mentions WHERE entity_id = $1::bigint',
      [id],
    );
    return Number(result.rows[0]?.total || 0);
  },

  getEntityDocumentsPaginated: async (
    entityId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<any[]> => {
    const id = Number(entityId);
    const safeLimit = Math.max(1, Math.min(200, limit));
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * safeLimit;
    const pool = getApiPool();
    const result = await pool.query(
      `SELECT 
         em.document_id,
         d.file_name as "documentTitle",
         d.date_created as "documentDate"
       FROM entity_mentions em
       JOIN documents d ON em.document_id = d.id
       WHERE em.entity_id = $1::bigint
       ORDER BY d.date_created DESC
       LIMIT $2::int OFFSET $3::int`,
      [id, safeLimit, offset],
    );
    return result.rows.map((m: any) => ({
      id: String(m.document_id),
      title: m.documentTitle,
      dateCreated: m.documentDate,
    }));
  },
};
