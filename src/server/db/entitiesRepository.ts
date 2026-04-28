import { entitiesQueries } from '@epstein/db';
import { Person, SearchFilters, SortOption } from '../../types.js';
import type { RiskLevel, SubjectCardListItemDto } from '@shared/dto/entities';
import { getApiPool } from './connection.js';
import { queryCache } from './cache.js';
import { buildVipDisplayLookup, resolveCanonicalVipName } from './vipNameResolver.js';

export interface EntityRepositoryResult {
  entities: Record<string, unknown>[];
  total: number;
}

// Helper for pgtyped query objects whose run signatures aren't fully reflected
function runQuery<TParams, TRow>(
  query: unknown,
  params: TParams,
  pool: ReturnType<typeof getApiPool>,
): Promise<TRow[]> {
  return (query as { run(p: TParams, c: typeof pool): Promise<TRow[]> }).run(params, pool);
}

async function getMaxConnectivityCached(
  pool: ReturnType<typeof getApiPool>,
): Promise<Array<{ maxConn?: number }>> {
  return queryCache.getOrSetAsync(
    'entities:maxConnectivity',
    () =>
      runQuery<undefined, { maxConn?: number }>(
        entitiesQueries.getMaxConnectivity,
        undefined,
        pool,
      ),
    600,
  );
}

export interface SubjectCardRepositoryResult {
  subjects: SubjectCardListItemDto[];
  total: number;
}

function toRiskLevel(value: unknown): RiskLevel {
  const normalized = String(value || 'LOW').toUpperCase();
  if (normalized === 'HIGH' || normalized === 'MEDIUM' || normalized === 'LOW') {
    return normalized;
  }
  return 'LOW';
}

function resolveDisplayName(name: string, lookup: Map<string, string>): string {
  return resolveCanonicalVipName(name, lookup);
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

function isLikelyInferredEntity(name: string, _role?: string): boolean {
  const n = String(name || '')
    .toLowerCase()
    .trim();

  if (!n) return false;
  if (/^(to|from|cc|bcc|subject|re|fwd|fw|of)\b[:\s-]*/.test(n)) return true;
  if (/\b(to|from|cc|bcc|subject|re|fwd|fw)\s*$/.test(n)) return true;
  if (/^(on|hi|hello|dear|sent|from|subject|regarding)\s+/i.test(n)) return true;
  if (/\s+subject$/i.test(n)) return true;
  const chronologicalPrefix =
    /^(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i;
  if (chronologicalPrefix.test(n)) return true;
  if (['original message', 'hi jeffrey', 'professor'].includes(n)) {
    return true;
  }
  if (/\b(?:.+?)'s\s+(lawyer|assistant|aide|counsel|staff|pilot|masseuse)\b/.test(n)) {
    return true;
  }
  if (/^(lawyer|assistant|aide|counsel|staff|pilot|masseuse)\b\s+/.test(n)) {
    return true;
  }
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

const SUBJECT_AGGREGATE_ENRICHMENT_LIMIT = Math.max(
  1,
  Number(process.env.SUBJECT_AGGREGATE_ENRICHMENT_LIMIT || 200) || 200,
);

async function loadAggregateStatsForSubjects(
  pool: ReturnType<typeof getApiPool>,
  subjectIds: number[],
): Promise<Map<number, { documents: number; distinctSources: number; verifiedMedia: number }>> {
  const aggregateStatsByEntity = new Map<
    number,
    { documents: number; distinctSources: number; verifiedMedia: number }
  >();

  if (subjectIds.length === 0) {
    return aggregateStatsByEntity;
  }

  const aggregateResult = await pool.query<{
    entity_id: number;
    documents: string | number;
    distinct_sources: string | number;
    verified_media: string | number;
  }>({
    text: `
      SELECT
        em.entity_id,
        COUNT(DISTINCT em.document_id) AS documents,
        COUNT(DISTINCT CASE
          WHEN d.evidence_type IS NOT NULL AND d.evidence_type != '' THEN d.evidence_type
          WHEN d.file_type ~* '^(image|video|audio)/' THEN 'media'
          WHEN d.file_name ~* '\\.(eml|msg)$' OR d.file_path ~* '/emails?/' THEN 'email'
          WHEN d.file_path ~* 'black.*book' THEN 'black_book'
          WHEN d.file_path ~* 'flight' THEN 'flight'
          WHEN d.file_name ~* '\\.(pdf|txt|docx?|xlsx?)$' THEN 'document'
          ELSE 'other'
        END) AS distinct_sources,
        COUNT(DISTINCT em.document_id) FILTER (
          WHERE d.evidence_type = 'media' OR d.file_type ~* '^(image|video|audio)/'
        ) AS verified_media
      FROM entity_mentions em
      LEFT JOIN documents d ON d.id = em.document_id
      WHERE em.entity_id = ANY($1::bigint[])
      GROUP BY em.entity_id
    `,
    values: [subjectIds],
  });

  for (const row of aggregateResult.rows) {
    aggregateStatsByEntity.set(Number(row.entity_id), {
      documents: Number(row.documents || 0),
      distinctSources: Number(row.distinct_sources || 0),
      verifiedMedia: Number(row.verified_media || 0),
    });
  }

  return aggregateStatsByEntity;
}

async function loadTopPhotosByEntity(
  pool: ReturnType<typeof getApiPool>,
  entityIds: number[],
): Promise<Map<number, number>> {
  if (entityIds.length === 0) return new Map();
  const result = await pool.query<{ id: number; entityId: string }>({
    text: `
      SELECT id, "entityId" FROM (
        SELECT
          m.id,
          COALESCE(mip.entity_id::bigint, m.entity_id::bigint)::text AS "entityId",
          ROW_NUMBER() OVER (
            PARTITION BY COALESCE(mip.entity_id::bigint, m.entity_id::bigint)
            ORDER BY m.red_flag_rating DESC NULLS LAST, m.id DESC
          ) AS rn
        FROM media_items m
        LEFT JOIN media_item_people mip ON m.id = mip.media_item_id::text
        WHERE (mip.entity_id::bigint = ANY($1::bigint[]) OR m.entity_id = ANY($1::bigint[]))
          AND m.file_type ILIKE 'image/%'
      ) t WHERE rn = 1
    `,
    values: [entityIds],
  });
  return new Map(result.rows.map((r) => [Number(r.entityId), r.id]));
}

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
  interface SubjectCardRow {
    id: number;
    fullName?: string;
    primaryRole?: string;
    bio?: string;
    mentions?: number;
    riskLevel?: string;
    redFlagRating?: number;
    connections?: string | number;
    mediaCount?: number;
    blackBookCount?: number;
    topPhotoId?: number | string;
  }
  let rows: SubjectCardRow[] = [];
  let countRows: { rows: { total: string }[] } | null = null;
  let maxConnResult: { maxConn?: number }[] | null = null;
  let vipDisplayLookup: Map<string, string> = new Map();

  try {
    const results = await Promise.all([
      runQuery<
        {
          searchTerm: string | null;
          riskLevels: string[] | null;
          minRedFlag: number | null;
          maxRedFlag: number | null;
          role: string | null;
          sortBy: string | null;
          limit: number;
          offset: number;
        },
        SubjectCardRow
      >(
        entitiesQueries.getSubjectCards,
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
      pool.query<{ total: string }>({
        text: `
          SELECT COUNT(*) as total
          FROM entities e
          WHERE ($1::text IS NULL OR e.full_name ILIKE $1 OR e.primary_role ILIKE $1 OR e.aliases ILIKE $1)
            AND ($2::text[] IS NULL OR e.risk_level = ANY($2::text[]))
            AND ($3::numeric IS NULL OR e.red_flag_rating >= $3::numeric)
            AND ($4::numeric IS NULL OR e.red_flag_rating <= $4::numeric)
            AND ($5::text IS NULL OR e.primary_role = $5)
        `,
        values: [searchTerm, riskLevels, minRedFlag, maxRedFlag, role],
      }),
      runQuery<undefined, { maxConn?: number }>(
        entitiesQueries.getMaxConnectivity,
        undefined,
        pool,
      ),
      buildVipDisplayLookup(),
    ]);

    rows = results[0] as SubjectCardRow[];
    countRows = { rows: (results[1] as { rows: { total: string }[] }).rows };
    maxConnResult = results[2] as { maxConn?: number }[];
    vipDisplayLookup = results[3] as Map<string, string>;
  } catch (err) {
    console.error('[CRITICAL] failure in getSubjectCardsFallback:', err);
    return { subjects: [], total: 0 };
  }

  const maxConnectivityCount = Math.max(1, Number(maxConnResult?.[0]?.maxConn || 1));
  const subjects: SubjectCardListItemDto[] = rows.map((row) => {
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
        riskLevel: toRiskLevel(row.riskLevel),
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
    };
  });

  try {
    const subjectIds = subjects
      .map((subject) => Number(subject.id))
      .filter((id) => Number.isFinite(id) && id > 0);
    const [aggregateStatsByEntity, topPhotoByEntity] = await Promise.all([
      subjectIds.length <= SUBJECT_AGGREGATE_ENRICHMENT_LIMIT
        ? loadAggregateStatsForSubjects(pool, subjectIds)
        : new Map<number, { documents: number; distinctSources: number; verifiedMedia: number }>(),
      loadTopPhotosByEntity(pool, subjectIds),
    ]);

    for (const subject of subjects) {
      const photoId = topPhotoByEntity.get(Number(subject.id));
      if (photoId) subject.topPhotoId = String(photoId);

      const aggregateStats = aggregateStatsByEntity.get(Number(subject.id));
      if (!aggregateStats) continue;
      subject.stats.documents = aggregateStats.documents;
      subject.stats.distinctSources = aggregateStats.distinctSources;
      subject.stats.verifiedMedia = aggregateStats.verifiedMedia;
      subject.forensics.signalStrength.corroboration = Math.min(
        100,
        aggregateStats.verifiedMedia * 20,
      );
      if (aggregateStats.verifiedMedia > 0) {
        subject.forensics.evidenceLadder = 'L1';
        if (!subject.forensics.driverLabels.includes('Media Mentions')) {
          subject.forensics.driverLabels = [
            ...subject.forensics.driverLabels,
            'Media Mentions',
          ].slice(0, 4);
        }
      }
    }
  } catch {
    // Fallback should stay fast even if aggregate enrichment is unavailable.
  }

  return {
    subjects,
    total: Number(countRows?.rows?.[0]?.total || 0),
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
      whereParts.push(`e.risk_level = ANY(${p}::text[])`);
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
      if (filters.entityType === 'vip_only') {
        whereParts.push(`COALESCE(e.is_vip, 0) > 0`);
      } else {
        const p = addParam(filters.entityType);
        whereParts.push(`e.entity_type ILIKE ${p}`);
      }
    }

    // Hard exclusion: never surface junk/OCR/role-fragment entities on the front page.
    // This is a WHERE-level filter so junk can't bubble up regardless of sort order.
    whereParts.push(`NOT (
      e.full_name ILIKE 'dear %'
      OR e.full_name ILIKE 'dearest %'
      OR e.full_name ILIKE 'watch %'
      OR e.full_name ILIKE 'watching %'
      OR e.full_name ILIKE 'defendant %'
      OR e.full_name ILIKE 'defendants %'
      OR e.full_name ILIKE 'plaintiff %'
      OR e.full_name ILIKE 'plaintiffs %'
      OR e.full_name ILIKE 'philanthropy %'
      OR LOWER(e.full_name) ~* '[a-z]s lawyer$'
      OR LOWER(e.full_name) ~* '[a-z]s assistant$'
      OR LOWER(e.full_name) ~* '[a-z]s pilot$'
      OR LOWER(e.full_name) ~* '[a-z]s masseuse$'
      OR LOWER(e.full_name) ~* '[a-z]s housekeeper$'
      OR LOWER(e.full_name) ~* '[a-z]s aide$'
      OR LOWER(e.full_name) ~* '[a-z]s counsel$'
    )`);

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    const riskRankExpr = `e.calculated_rank_score`;
    const inferredRankExpr = `(CASE WHEN e.calculated_rank_score < 0 THEN 1 ELSE 0 END)`;
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
    const documentCountExpr = `e.evidence_count`;
    const mentionCountExpr = `e.mentions`;

    if (sortKey === 'red_flag' || sortKey === 'rfi' || sortKey === 'default') {
      // Canonical ordering for subject cards:
      // Calculated Rank Score -> Mentions
      orderByTerms.push(`${riskRankExpr} ${sortOrder}`, `${mentionCountExpr} ${sortOrder}`);
    } else if (sortKey === 'risk') {
      orderByTerms.push(
        `${riskRankExpr} ${sortOrder}`,
        `COALESCE(e.red_flag_rating, 0) ${sortOrder}`,
        `${mentionCountExpr} ${sortOrder}`,
      );
    } else if (sortKey === 'mentions') {
      orderByTerms.push(
        `${mentionCountExpr} ${sortOrder}`,
        `COALESCE(e.red_flag_rating, 0) DESC`,
        `${riskRankExpr} DESC`,
      );
    } else if (sortKey === 'document_count' || sortKey === 'document-count') {
      orderByTerms.push(
        `${documentCountExpr} ${sortOrder}`,
        `COALESCE(e.red_flag_rating, 0) DESC`,
        `${riskRankExpr} DESC`,
        `${mentionCountExpr} DESC`,
      );
    } else if (sortKey === 'recent') {
      orderByTerms.push(
        `e.id ${sortOrder}`,
        `COALESCE(e.red_flag_rating, 0) DESC`,
        `${riskRankExpr} DESC`,
        `${mentionCountExpr} DESC`,
      );
    } else {
      orderByTerms.push(`LOWER(COALESCE(e.full_name, '')) ${sortOrder}`);
    }

    orderByTerms.push(`COALESCE(e.is_vip, 0) DESC`, `LOWER(COALESCE(e.full_name, '')) ASC`);
    const orderBySql = orderByTerms.join(', ');

    const listParams = [...params, limit, offset];

    try {
      const [rawEntitiesResult, countResult, maxConnResult, vipDisplayLookup] = await Promise.all([
        pool.query({
          text: `
          SELECT
            e.id,
            e.full_name as "fullName",
            e.primary_role as "primaryRole",
            e.bio,
            COALESCE(e.mentions, 0) as mentions,
            e.risk_level as "riskLevel",
            e.red_flag_rating as "redFlagRating",
            e.connections_summary as "connections",
            e.was_agentic as "wasAgentic"
          FROM entities e
          ${whereSql}
          ORDER BY ${orderBySql}
          LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
          `,
          values: listParams,
        }),
        pool.query<{ total: string }>({
          text: `
          SELECT COUNT(*)::bigint AS total
          FROM entities e
          ${whereSql}
          `,
          values: params,
        }),
        getMaxConnectivityCached(pool),
        buildVipDisplayLookup(),
      ]);

      const rawEntities = rawEntitiesResult.rows as Array<Record<string, unknown>>;
      const total = Number(countResult.rows[0]?.total || 0);
      const maxConnectivityCount = Number(maxConnResult[0]?.maxConn || 1);
      const entitiesForPageMerge = rawEntities;

      const subjectIds = entitiesForPageMerge
        .map((row) => Number(row.id))
        .filter((id) => Number.isFinite(id) && id > 0);

      const [aggregateStatsByEntity, topPhotoByEntity] = await Promise.all([
        subjectIds.length <= SUBJECT_AGGREGATE_ENRICHMENT_LIMIT
          ? loadAggregateStatsForSubjects(pool, subjectIds)
          : new Map<
              number,
              { documents: number; distinctSources: number; verifiedMedia: number }
            >(),
        loadTopPhotosByEntity(pool, subjectIds),
      ]);

      const subjects: SubjectCardListItemDto[] = entitiesForPageMerge.map((e) => {
        const entityId = Number(e.id || 0);
        const aggregateStats = aggregateStatsByEntity.get(entityId);
        const mentions = Number(e.mentions || 0);
        const mediaCount = Number(aggregateStats?.verifiedMedia ?? Number(e.mediaCount || 0));
        const blackBookCount = Number(e.blackBookCount || 0);

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
          name: resolveDisplayName(String(e.fullName || 'Unknown'), vipDisplayLookup),
          role: String(e.primaryRole || 'Unknown'),
          shortBio: typeof e.bio === 'string' ? e.bio : undefined,
          stats: {
            mentions,
            documents: aggregateStats?.documents ?? 0,
            distinctSources: aggregateStats?.distinctSources ?? 0,
            verifiedMedia: mediaCount,
          },
          forensics: {
            riskLevel: toRiskLevel(e.riskLevel),
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
          ...(topPhotoByEntity.has(entityId)
            ? { topPhotoId: String(topPhotoByEntity.get(entityId)) }
            : {}),
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
          topPhotoId: base.topPhotoId || other.topPhotoId,
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

        return a.name.localeCompare(b.name);
      });

      return {
        subjects: normalizedSubjects,
        total,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code || '')
          : '';
      const isStatementTimeout =
        code === '57014' || /statement timeout|query read timeout|timeout/i.test(message);
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
        topPhotoId: subject.topPhotoId || undefined,
      };
    });

    return {
      entities: normalizedEntities,
      total: Number(result.total || 0),
    };
  },

  getAllEntities: async (limit: number = 0): Promise<Array<Record<string, unknown>>> => {
    const rows = await runQuery<
      {
        searchTerm: null;
        riskLevels: null;
        minRedFlag: null;
        maxRedFlag: null;
        role: null;
        sortBy: 'name';
        limit: number;
        offset: number;
      },
      Record<string, unknown>
    >(
      entitiesQueries.getSubjectCards,
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

  getEntityById: async (
    id: string | number,
  ): Promise<
    | (Person & {
        relationships: Array<{
          targetId: string;
          targetName: unknown;
          targetRole: unknown;
          type: unknown;
          confidence: number;
        }>;
      })
    | null
  > => {
    const entityId = Number(id);
    const rows = await runQuery<{ id: number }, Record<string, unknown>>(
      entitiesQueries.getEntityById,
      { id: entityId },
      getApiPool(),
    );
    const entity = rows[0];

    if (!entity) return null;

    const mentions = await runQuery<{ entityId: number; limit: number }, Record<string, unknown>>(
      entitiesQueries.getEntityMentions,
      { entityId, limit: 100 },
      getApiPool(),
    );
    const relationships = await runQuery<{ entityId: number }, Record<string, unknown>>(
      entitiesQueries.getEntityRelationships,
      { entityId },
      getApiPool(),
    );

    return {
      ...entity,
      id: String(entity.id),
      name: String(entity.full_name || entity.name || 'Unknown'),
      fullName: String(entity.full_name || ''),
      primaryRole: String(entity.primary_role || 'Unknown'),
      mentions: Number(entity.mentions || 0),
      files: Number(mentions.length || 0),
      contexts: [],
      evidenceTypes: [],
      redFlagRating: Number(entity.red_flag_rating || 0),
      isVip: Boolean(entity.is_vip),
      wasAgentic: Boolean(entity.was_agentic),
      fileReferences: mentions.map((m) => ({
        id: String(m.document_id),
        filename: String(m.documentTitle || ''),
        filePath: String(m.documentPath || ''),
        contentPreview: String(m.mention_context || ''),
      })),
      significantPassages: mentions.slice(0, 5).map((m) => ({
        passage: String(m.mention_context || ''),
        keyword: String(m.surface_text || ''),
        filename: String(m.documentTitle || 'Document'),
        documentId: String(m.document_id),
      })),
      relationships: relationships.map((r) => ({
        targetId: String(r.target_entity_id),
        targetName: r.targetName,
        targetRole: r.targetRole,
        type: r.relationship_type,
        confidence: Number(r.confidence || 0),
      })),
    };
  },

  getEntitySummarySource: async (
    entityId: number | string,
    topN: number = 10,
  ): Promise<Record<string, unknown> | null> => {
    const id = Number(entityId);
    const rows = await runQuery<{ id: number }, Record<string, unknown>>(
      entitiesQueries.getEntityById,
      { id: id },
      getApiPool(),
    );
    const entity = rows[0];

    if (!entity) return null;

    const relationships = await runQuery<{ entityId: number }, Record<string, unknown>>(
      entitiesQueries.getEntityRelationships,
      { entityId: id },
      getApiPool(),
    );
    const mentions = await runQuery<{ entityId: number; limit: number }, Record<string, unknown>>(
      entitiesQueries.getEntityMentions,
      { entityId: id, limit: topN },
      getApiPool(),
    );

    return {
      entity: {
        ...entity,
        id: String(entity.id),
      },
      relationships: relationships.slice(0, topN).map((r) => ({
        targetId: String(r.target_entity_id),
        targetName: r.targetName,
        type: r.relationship_type,
        confidence: Number(r.confidence || 0),
      })),
      documents: mentions.map((m) => ({
        id: String(m.document_id),
        title: m.documentTitle,
        date: m.documentDate,
      })),
    };
  },

  getEntityDocuments: async (
    entityId: string,
  ): Promise<Array<{ id: string; title: unknown; dateCreated: unknown }>> => {
    const id = Number(entityId);
    const mentions = await runQuery<{ entityId: number; limit: number }, Record<string, unknown>>(
      entitiesQueries.getEntityMentions,
      { entityId: id, limit: 1000 },
      getApiPool(),
    );
    return mentions.map((m) => ({
      id: String(m.document_id),
      title: m.documentTitle,
      dateCreated: m.documentDate,
    }));
  },

  getEntityDocumentCount: async (
    entityId: string,
    filters?: { search?: string; source?: string },
  ): Promise<number> => {
    const id = Number(entityId);
    const pool = getApiPool();
    const params: Array<unknown> = [BigInt(id)];
    const whereParts: string[] = ['em.entity_id = $1::bigint'];

    if (filters?.search?.trim()) {
      params.push(`%${filters.search.trim()}%`);
      whereParts.push(
        `(d.file_name ILIKE $${params.length} OR d.title ILIKE $${params.length} OR d.content_preview ILIKE $${params.length})`,
      );
    }
    if (filters?.source && filters.source !== 'all') {
      params.push(filters.source);
      whereParts.push(`LOWER(COALESCE(d.evidence_type, '')) = LOWER($${params.length})`);
    }

    const result = await pool.query(
      `SELECT COUNT(DISTINCT d.id)::int AS total
       FROM documents d
       INNER JOIN entity_mentions em ON d.id = em.document_id
       WHERE ${whereParts.join(' AND ')}`,
      params,
    );
    return Number(result.rows[0]?.total || 0);
  },

  getEntityDocumentsPaginated: async (
    entityId: string,
    page: number = 1,
    limit: number = 50,
    filters?: { search?: string; source?: string; sort?: string },
  ): Promise<Array<Record<string, unknown>>> => {
    const id = BigInt(entityId);
    const safeLimit = Math.max(1, Math.min(200, limit || 50));
    const safePage = Math.max(1, page || 1);
    const offset = (safePage - 1) * safeLimit;
    const pool = getApiPool();

    const params: Array<unknown> = [id];
    const whereParts: string[] = ['em.entity_id = $1::bigint'];

    if (filters?.search?.trim()) {
      params.push(`%${filters.search.trim()}%`);
      whereParts.push(
        `(d.file_name ILIKE $${params.length} OR d.title ILIKE $${params.length} OR d.content_preview ILIKE $${params.length})`,
      );
    }

    if (filters?.source && filters.source !== 'all') {
      params.push(filters.source);
      whereParts.push(`LOWER(COALESCE(d.evidence_type, '')) = LOWER($${params.length})`);
    }

    params.push(safeLimit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    // Check if we need natural sort for testimonies
    // We can check the entity name if it was passed, but here we only have entityId.
    // However, the requested sort can be triggered by a specific sort value or detected.
    const isNaturalSort = filters?.sort === 'human' || filters?.sort === 'natural';

    const ALLOWED_SORTS: Record<string, { select: string; order: string }> = {
      date: {
        select: 'date_created',
        order: 'date_created DESC NULLS LAST',
      },
      date_asc: {
        select: 'date_created',
        order: 'date_created ASC NULLS LAST',
      },
      red_flag: {
        select: 'red_flag_rating',
        order: 'red_flag_rating DESC NULLS LAST, date_created DESC NULLS LAST',
      },
      title: {
        select: 'file_name',
        order: 'file_name ASC NULLS LAST',
      },
      human: {
        select: "substring(COALESCE(title, file_name) from 'Part ([0-9]+)')::int",
        order:
          "substring(COALESCE(title, file_name) from 'Part ([0-9]+)')::int ASC NULLS LAST, date_created DESC NULLS LAST",
      },
    };

    const sortConfig =
      ALLOWED_SORTS[filters?.sort ?? ''] ??
      (isNaturalSort ? ALLOWED_SORTS['human'] : ALLOWED_SORTS['date']);

    const finalizedQuery = `
      WITH UniqueDocs AS (
        SELECT DISTINCT ON (d.id)
          d.id,
          COALESCE(d.title, d.file_name)          AS title,
          d.file_name,
          d.file_path,
          d.file_type,
          d.evidence_type,
          d.date_created,
          d.red_flag_rating,
          d.word_count,
          d.content_preview,
          LEFT(d.content, 500)                    AS content,
          d.content_refined,
          d.metadata_json
        FROM documents d
        INNER JOIN entity_mentions em ON d.id = em.document_id
        WHERE ${whereParts.join(' AND ')}
        ORDER BY d.id
      )
      SELECT * FROM UniqueDocs
      ORDER BY ${sortConfig.order}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const result = await pool.query(finalizedQuery, params);

    return result.rows.map((row) => ({
      id: String(row.id),
      title: row.title ?? row.file_name ?? null,
      fileName: row.file_name ?? null,
      filePath: row.file_path ?? null,
      fileType: row.file_type ?? null,
      evidenceType: row.evidence_type ?? null,
      dateCreated: row.date_created ?? null,
      redFlagRating: Number(row.red_flag_rating ?? 0),
      wordCount: Number(row.word_count ?? 0),
      contentPreview: row.content_preview ?? null,
      content: row.content ?? null,
      content_refined: row.content_refined ?? null,
      metadata: row.metadata_json ?? null,
    }));
  },
};
