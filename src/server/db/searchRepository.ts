import { searchQueries } from '@epstein/db';
import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';
import { buildVipDisplayLookup, resolveCanonicalVipName } from './vipNameResolver.js';
import { getSemanticCapability, SemanticCapability } from '../semantic/capability.js';
import { searchDocumentsSemantic, searchEntitiesSemantic } from '../semantic/search.js';

const normalizeAliasValue = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const parseEntityAliases = (aliases: string | null | undefined): string[] => {
  if (!aliases) return [];
  try {
    const parsed = JSON.parse(aliases);
    if (Array.isArray(parsed)) return parsed.map((e) => String(e || '').trim()).filter(Boolean);
  } catch {
    /* fall through */
  }
  return String(aliases)
    .split(/[;,|]/)
    .map((e) => e.trim())
    .filter(Boolean);
};

const resolveMatchedAlias = (
  searchTerm: string,
  canonicalName: string,
  aliases: string[],
): string | null => {
  const n = normalizeAliasValue(searchTerm);
  if (!n) return null;
  if (normalizeAliasValue(canonicalName) === n) return null;
  return (
    aliases.find((a) => normalizeAliasValue(a) === n) ||
    aliases.find((a) => normalizeAliasValue(a).includes(n)) ||
    null
  );
};

/**
 * Build a Postgres tsquery for autocomplete / prefix mode.
 * Only used when mode=prefix; default is websearch_to_tsquery.
 * Safe — strips non-alphanumeric characters before building.
 */
function buildPrefixQuery(phrase: string): string {
  const tokens = phrase
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9_]/g, ''))
    .filter((w) => w.length > 1);
  return tokens.length > 0 ? tokens.map((w) => `${w}:*`).join(' & ') : '';
}

async function loadEntityFallbackRows(searchTerm: string, limit: number) {
  if (!searchTerm || limit <= 0) return { rows: [] };

  const partialPattern = `%${searchTerm}%`;
  const normalizedSearchTerm = searchTerm.toLowerCase();
  const similarityThreshold = 0.24;
  return getApiPool().query<{
    id: number | string;
    fullName: string | null;
    primaryRole: string | null;
    aliases: string | null;
    redFlagRating: number | string | null;
    similarityScore: number | string | null;
  }>(
    `
      SELECT
        e.id,
        e.full_name AS "fullName",
        e.primary_role AS "primaryRole",
        e.aliases,
        e.red_flag_rating AS "redFlagRating",
        GREATEST(
          similarity(LOWER(COALESCE(e.full_name, '')), $2),
          similarity(LOWER(COALESCE(e.aliases, '')), $2)
        ) AS "similarityScore"
      FROM entities e
      WHERE COALESCE(e.junk_tier, 'clean') = 'clean'
        AND COALESCE(e.quarantine_status, 0) = 0
        AND (
          e.full_name ILIKE $1
          OR COALESCE(e.aliases, '') ILIKE $1
          OR similarity(LOWER(COALESCE(e.full_name, '')), $2) >= $4
          OR similarity(LOWER(COALESCE(e.aliases, '')), $2) >= $4
        )
      ORDER BY
        CASE
          WHEN LOWER(e.full_name) = LOWER($2) THEN 0
          WHEN LOWER(COALESCE(e.aliases, '')) LIKE '%' || LOWER($2) || '%' THEN 1
          WHEN LOWER(e.full_name) LIKE LOWER($2) || '%' THEN 2
          WHEN GREATEST(
            similarity(LOWER(COALESCE(e.full_name, '')), $2),
            similarity(LOWER(COALESCE(e.aliases, '')), $2)
          ) >= $4 THEN 3
          ELSE 4
        END,
        "similarityScore" DESC,
        COALESCE(e.red_flag_rating, 0) DESC,
        COALESCE(e.mentions, 0) DESC,
        e.id DESC
      LIMIT $3
    `,
    [partialPattern, normalizedSearchTerm, limit, similarityThreshold],
  );
}

interface ISearchDocumentsResult {
  evidenceType: string | null;
  fileName: string | null;
  filePath: string | null;
  id: string;
  rank: number | null;
  redFlagRating: number | null;
  snippet: string | null;
}

interface ISearchDocumentsPrefixResult {
  evidenceType: string | null;
  fileName: string | null;
  filePath: string | null;
  id: string;
  rank: number | null;
  redFlagRating: number | null;
  snippet: string | null;
}

interface ISearchInvestigationsResult {
  description: string | null;
  id: string;
  rank: number | null;
  snippet: string | null;
  status: string | null;
  title: string;
  uuid: string | null;
}

interface ISearchArticlesResult {
  author: string | null;
  id: string;
  pubDate: Date | null;
  rank: number | null;
  snippet: string | null;
  source: string | null;
  title: string;
}

interface ISearchMediaResult {
  description: string | null;
  filename: string;
  filePath: string;
  fileType: string | null;
  id: string;
  rank: number | null;
  snippet: string | null;
  title: string | null;
}

interface EntitySearchRow {
  aliases: string | null;
  fullName: string | null;
  id: string | number;
  primaryRole: string | null;
  rank?: number | null;
  redFlagRating: number | string | null;
  similarityScore?: number | string | null;
}

type DocumentSearchRow = ISearchDocumentsResult | ISearchDocumentsPrefixResult;
type SearchArticleDto = {
  id: string;
  title: string;
  source: string | null;
  author: string | null;
  pubDate: Date | null;
  snippet: string | null;
  rank: number | null;
};
type SearchMediaDto = {
  id: string;
  filename: string;
  title: string | null;
  description: string | null;
  filePath: string;
  fileType: string | null;
  snippet: string | null;
  rank: number | null;
};

export interface UnifiedSearchResult {
  entities: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  investigations: Record<string, unknown>[];
  articles: Record<string, unknown>[];
  media: Record<string, unknown>[];
  didYouMean: Record<string, unknown>[];
  semanticCapability?: SemanticCapability;
  requestedMode?: 'lexical' | 'semantic' | 'hybrid';
  effectiveMode?: 'lexical' | 'semantic' | 'hybrid';
}

interface SearchFilters {
  evidenceType?: string;
  redFlagBand?: string;
  mode?: 'web' | 'prefix' | 'lexical' | 'semantic' | 'hybrid';
  sourceType?: string;
  mediaType?: string;
  entityType?: string;
  reviewState?: string;
  confidenceMin?: number;
  confidenceMax?: number;
  dateFrom?: string;
  dateTo?: string;
}

const matchesTextFilter = (actual: unknown, expected?: string): boolean => {
  if (!expected || expected === 'ALL') return true;
  return String(actual || '').toLowerCase() === expected.toLowerCase();
};

const matchesDateRange = (actual: unknown, dateFrom?: string, dateTo?: string): boolean => {
  if (!dateFrom && !dateTo) return true;
  if (!actual) return false;
  const time = new Date(String(actual)).getTime();
  if (!Number.isFinite(time)) return false;
  if (dateFrom && time < new Date(dateFrom).getTime()) return false;
  if (dateTo && time > new Date(dateTo).getTime()) return false;
  return true;
};

export const searchRepository = {
  search: async (
    query: string,
    limit: number = 50,
    filters: SearchFilters = {},
  ): Promise<UnifiedSearchResult> => {
    const searchTerm = query.trim();
    if (!searchTerm) {
      return {
        entities: [],
        documents: [],
        investigations: [],
        articles: [],
        media: [],
        didYouMean: [],
      };
    }

    const safeLimit = Math.min(200, Math.max(1, limit));
    const searchMode = filters.mode || 'lexical';
    const isPrefix = searchMode === 'prefix';
    const isSemanticOnly = searchMode === 'semantic';
    const isHybrid = searchMode === 'hybrid';

    const capability =
      isSemanticOnly || isHybrid ? await getSemanticCapability() : { available: false };
    const canDoSemantic = capability.available;

    // Fallback logic for semantic
    let effectiveMode: 'lexical' | 'semantic' | 'hybrid' = 'lexical';
    if (isSemanticOnly) {
      effectiveMode = canDoSemantic ? 'semantic' : 'lexical';
    } else if (isHybrid) {
      effectiveMode = canDoSemantic ? 'hybrid' : 'lexical';
    } else {
      effectiveMode = 'lexical';
    }

    const tsArg = isPrefix ? buildPrefixQuery(searchTerm) : searchTerm;
    if (isPrefix && !tsArg) {
      return {
        entities: [],
        documents: [],
        investigations: [],
        articles: [],
        media: [],
        didYouMean: [],
      };
    }

    // ── Entities ─────────────────────────────────────────────────────────────
    let mergedEntityRows: EntitySearchRow[] = [];
    const entityMatchReasons = new Map<string, string>();

    if (effectiveMode === 'semantic') {
      try {
        const semanticResults = await searchEntitiesSemantic(searchTerm, safeLimit);
        const semanticIds = semanticResults.map((r) => Number(r.id));
        if (semanticIds.length > 0) {
          const dbRows = await getApiPool().query<{
            id: number | string;
            fullName: string | null;
            primaryRole: string | null;
            aliases: string | null;
            redFlagRating: number | string | null;
          }>(
            `
              SELECT
                id,
                full_name AS "fullName",
                primary_role AS "primaryRole",
                aliases,
                red_flag_rating AS "redFlagRating"
              FROM entities
              WHERE id = ANY($1::bigint[])
            `,
            [semanticIds],
          );
          // Preserve semantic order
          mergedEntityRows = semanticIds
            .map((id) => dbRows.rows.find((r) => Number(r.id) === id))
            .filter((row): row is EntitySearchRow => Boolean(row));
          semanticResults.forEach((r) => entityMatchReasons.set(String(r.id), 'semantic'));
        }
      } catch (error) {
        logger.error({ err: error }, '[searchRepository] semantic entity search failed');
      }
    } else {
      // Lexical or Hybrid
      const entityRows = isPrefix
        ? await searchQueries.searchEntitiesPrefix.run(
            { searchTerm: tsArg, limit: safeLimit },
            getApiPool(),
          )
        : await searchQueries.searchEntities.run(
            { searchTerm: tsArg, limit: safeLimit },
            getApiPool(),
          );
      mergedEntityRows = [...entityRows];
      mergedEntityRows.forEach((r) => entityMatchReasons.set(String(r.id), 'text'));

      if (effectiveMode === 'hybrid') {
        try {
          const semanticResults = await searchEntitiesSemantic(
            searchTerm,
            Math.floor(safeLimit / 2),
          );
          const seenIds = new Set(mergedEntityRows.map((r) => String(r.id)));
          const semanticIdsToFetch = semanticResults
            .filter((r) => !seenIds.has(String(r.id)))
            .map((r) => Number(r.id));

          if (semanticIdsToFetch.length > 0) {
            const dbRows = await getApiPool().query<{
              id: number | string;
              fullName: string | null;
              primaryRole: string | null;
              aliases: string | null;
              redFlagRating: number | string | null;
            }>(
              `
                SELECT
                  id,
                  full_name AS "fullName",
                  primary_role AS "primaryRole",
                  aliases,
                  red_flag_rating AS "redFlagRating"
                FROM entities
                WHERE id = ANY($1::bigint[])
              `,
              [semanticIdsToFetch],
            );
            for (const r of semanticResults) {
              const sid = String(r.id);
              if (seenIds.has(sid)) {
                entityMatchReasons.set(sid, 'hybrid');
              } else {
                const row = dbRows.rows.find((dbR) => Number(dbR.id) === Number(r.id));
                if (row) {
                  mergedEntityRows.push(row);
                  entityMatchReasons.set(sid, 'semantic');
                  seenIds.add(sid);
                }
              }
            }
          } else {
            // All semantic results already in lexical set
            semanticResults.forEach((r) => entityMatchReasons.set(String(r.id), 'hybrid'));
          }
        } catch (error) {
          logger.warn({ err: error }, '[searchRepository] hybrid semantic entity search failed');
        }
      }
    }

    if (!isPrefix && mergedEntityRows.length < safeLimit && effectiveMode !== 'semantic') {
      try {
        const fallbackRows = await loadEntityFallbackRows(
          searchTerm,
          Math.max(safeLimit * 2, safeLimit - mergedEntityRows.length),
        );
        const seenIds = new Set(mergedEntityRows.map((row) => String(row.id)));
        for (const row of fallbackRows.rows) {
          const entityId = String(row.id);
          if (seenIds.has(entityId)) continue;
          mergedEntityRows.push(row);
          entityMatchReasons.set(entityId, 'entity-alias');
          seenIds.add(entityId);
          if (mergedEntityRows.length >= safeLimit) break;
        }
      } catch (error) {
        logger.warn({ err: error }, '[searchRepository] entity fallback search failed');
      }
    }

    // ── Documents ─────────────────────────────────────────────────────────────
    let minRedFlag: number | null = null;
    let maxRedFlag: number | null = null;

    if (filters.redFlagBand === 'high') {
      minRedFlag = 4;
    } else if (filters.redFlagBand === 'medium') {
      minRedFlag = 2;
      maxRedFlag = 3;
    } else if (filters.redFlagBand === 'low') {
      maxRedFlag = 1;
    }

    // ── Documents ─────────────────────────────────────────────────────────────
    let docRows: DocumentSearchRow[] = [];
    const docMatchReasons = new Map<string, string>();

    if (effectiveMode === 'semantic') {
      try {
        const semanticResults = await searchDocumentsSemantic(searchTerm, safeLimit);
        const semanticIds = semanticResults.map((r) => Number(r.id));
        if (semanticIds.length > 0) {
          const dbRows = await getApiPool().query<{
            id: number | string;
            fileName: string | null;
            filePath: string | null;
            evidenceType: string | null;
            redFlagRating: number | string | null;
          }>(
            `
              SELECT
                id,
                file_name AS "fileName",
                file_path AS "filePath",
                evidence_type AS "evidenceType",
                red_flag_rating AS "redFlagRating"
              FROM documents
              WHERE id = ANY($1::bigint[])
            `,
            [semanticIds],
          );
          // Preserve semantic order
          const docById = new Map<number, (typeof dbRows.rows)[number]>(
            dbRows.rows.map((row) => [Number(row.id), row]),
          );
          docRows = semanticIds
            .map((id) => {
              const row = docById.get(id);
              if (!row) return null;
              return {
                id: String(row.id),
                fileName: row.fileName,
                filePath: row.filePath,
                evidenceType: row.evidenceType,
                redFlagRating:
                  row.redFlagRating === null || row.redFlagRating === undefined
                    ? null
                    : Number(row.redFlagRating),
                rank: null,
                snippet: null,
              } as DocumentSearchRow;
            })
            .filter((row): row is DocumentSearchRow => row != null);
          semanticResults.forEach((r) => docMatchReasons.set(String(r.id), 'semantic'));
        }
      } catch (error) {
        logger.error({ err: error }, '[searchRepository] semantic document search failed');
      }
    } else {
      // Lexical or Hybrid
      const lexicalRows = isPrefix
        ? await searchQueries.searchDocumentsPrefix.run(
            {
              searchTerm: tsArg,
              limit: safeLimit,
              evidenceType:
                filters.evidenceType && filters.evidenceType !== 'ALL'
                  ? filters.evidenceType.toLowerCase()
                  : null,
              minRedFlag,
              maxRedFlag,
            },
            getApiPool(),
          )
        : await searchQueries.searchDocuments.run(
            {
              searchTerm: tsArg,
              limit: safeLimit,
              evidenceType:
                filters.evidenceType && filters.evidenceType !== 'ALL'
                  ? filters.evidenceType.toLowerCase()
                  : null,
              minRedFlag,
              maxRedFlag,
            },
            getApiPool(),
          );
      docRows = [...lexicalRows];
      docRows.forEach((r) => docMatchReasons.set(String(r.id), 'text'));

      if (effectiveMode === 'hybrid') {
        try {
          const semanticResults = await searchDocumentsSemantic(
            searchTerm,
            Math.floor(safeLimit / 2),
          );
          const seenIds = new Set(docRows.map((r) => String(r.id)));
          const semanticIdsToFetch = semanticResults
            .filter((r) => !seenIds.has(String(r.id)))
            .map((r) => Number(r.id));

          if (semanticIdsToFetch.length > 0) {
            const dbRows = await getApiPool().query<DocumentSearchRow>(
              `
                SELECT
                  id::text AS id,
                  file_name AS "fileName",
                  file_path AS "filePath",
                  evidence_type AS "evidenceType",
                  red_flag_rating AS "redFlagRating",
                  0.0 AS rank,
                  '' AS snippet
                FROM documents
                WHERE id = ANY($1::bigint[])
              `,
              [semanticIdsToFetch],
            );
            for (const r of semanticResults) {
              const sid = String(r.id);
              if (seenIds.has(sid)) {
                docMatchReasons.set(sid, 'hybrid');
              } else {
                const row = dbRows.rows.find((dbR) => Number(dbR.id) === Number(r.id));
                if (row) {
                  docRows.push(row);
                  docMatchReasons.set(sid, 'semantic');
                  seenIds.add(sid);
                }
              }
            }
          } else {
            // All semantic results already in lexical set
            semanticResults.forEach((r) => docMatchReasons.set(String(r.id), 'hybrid'));
          }
        } catch (error) {
          logger.warn({ err: error }, '[searchRepository] hybrid semantic document search failed');
        }
      }
    }

    // ── Investigations ───────────────────────────────────────────────────────
    const investigationRows = await searchQueries.searchInvestigations.run(
      { searchTerm: tsArg, limit: safeLimit },
      getApiPool(),
    );

    // ── Articles ─────────────────────────────────────────────────────────────
    const articleRows = await searchQueries.searchArticles.run(
      { searchTerm: tsArg, limit: safeLimit },
      getApiPool(),
    );

    // ── Media ────────────────────────────────────────────────────────────────
    const mediaRows = await searchQueries.searchMedia.run(
      { searchTerm: tsArg, limit: safeLimit },
      getApiPool(),
    );

    const entityIds = mergedEntityRows
      .map((row: { id: string | number }) => Number(row.id))
      .filter((id: number) => Number.isFinite(id) && id > 0);
    const entityStatsById = new Map<
      number,
      { mentions: number; files: number; riskLevel: string | null; redFlagRating: number | null }
    >();
    if (entityIds.length > 0) {
      const statsRes = await getApiPool().query<{
        entity_id: number;
        mentions: string | number;
        files: string | number;
        risk_level: string | null;
        red_flag_rating: string | number | null;
      }>(
        `
          SELECT
            e.id AS entity_id,
            COALESCE(e.mentions, 0) AS mentions,
            COUNT(DISTINCT em.document_id) AS files,
            e.risk_level,
            e.red_flag_rating
          FROM entities e
          LEFT JOIN entity_mentions em ON em.entity_id = e.id
          WHERE e.id = ANY($1::bigint[])
          GROUP BY e.id, e.mentions, e.risk_level, e.red_flag_rating
        `,
        [entityIds],
      );
      for (const row of statsRes.rows) {
        entityStatsById.set(Number(row.entity_id), {
          mentions: Number(row.mentions || 0),
          files: Number(row.files || 0),
          riskLevel: row.risk_level ? String(row.risk_level).toUpperCase() : null,
          redFlagRating:
            row.red_flag_rating === null || row.red_flag_rating === undefined
              ? null
              : Number(row.red_flag_rating),
        });
      }
    }

    const documentIds = docRows
      .map((row: { id: string | number }) => Number(row.id))
      .filter((id: number) => Number.isFinite(id) && id > 0);
    const documentMetaById = new Map<
      number,
      { fileType: string | null; dateCreated: string | null }
    >();
    if (documentIds.length > 0) {
      const metaRes = await getApiPool().query<{
        id: number;
        file_type: string | null;
        date_created: string | null;
      }>(
        `
          SELECT id, file_type, date_created
          FROM documents
          WHERE id = ANY($1::bigint[])
        `,
        [documentIds],
      );
      for (const row of metaRes.rows) {
        documentMetaById.set(Number(row.id), {
          fileType: row.file_type || null,
          dateCreated: row.date_created || null,
        });
      }
    }

    const vipDisplayLookup = await buildVipDisplayLookup();

    const entities = mergedEntityRows
      .map((row) => {
        const aliases = parseEntityAliases(typeof row.aliases === 'string' ? row.aliases : null);
        const resolvedName = resolveCanonicalVipName(String(row.fullName || ''), vipDisplayLookup);
        const stats = entityStatsById.get(Number(row.id));
        return {
          id: String(row.id),
          fullName: resolvedName,
          canonicalName: resolvedName,
          name: resolvedName,
          primaryRole: String(row.primaryRole || ''),
          title: String(row.primaryRole || ''),
          aliases,
          matchedAlias: resolveMatchedAlias(searchTerm, resolvedName, aliases),
          entityType: 'Person',
          secondaryRoles: [],
          likelihoodLevel: stats?.riskLevel ?? null,
          mentions: stats?.mentions ?? 0,
          currentStatus: null,
          connectionsSummary: null,
          redFlagRating:
            row.redFlagRating !== null && row.redFlagRating !== undefined
              ? Number(row.redFlagRating)
              : (stats?.redFlagRating ?? null),
          redFlagScore: null,
          redFlagIndicators: [],
          redFlagDescription: null,
          titleVariants: [],
          evidenceTypes: [],
          files: stats?.files ?? 0,
          matchReason: entityMatchReasons.get(String(row.id)) || 'text',
        };
      })
      .filter((entity) => matchesTextFilter(entity.entityType, filters.entityType));

    const documents = docRows
      .map((row: ISearchDocumentsResult | ISearchDocumentsPrefixResult) => {
        const meta = documentMetaById.get(Number(row.id));
        const rid = String(row.id);
        return {
          id: rid,
          fileName: row.fileName,
          title: row.fileName,
          filePath: row.filePath,
          fileType: meta?.fileType ?? null,
          evidenceType: row.evidenceType,
          fileSize: null,
          dateCreated: meta?.dateCreated ?? null,
          wordCount: null,
          redFlagRating: row.redFlagRating,
          createdAt: meta?.dateCreated ?? null,
          snippet: row.snippet,
          matchReason: docMatchReasons.get(rid) || 'text',
        };
      })
      .filter((doc) => matchesTextFilter(doc.evidenceType || doc.fileType, filters.sourceType))
      .filter((doc) => matchesDateRange(doc.dateCreated, filters.dateFrom, filters.dateTo));

    const investigations = investigationRows.map((row: ISearchInvestigationsResult) => ({
      id: String(row.id),
      uuid: row.uuid,
      title: row.title,
      description: row.description,
      status: row.status,
      snippet: row.snippet,
      rank: row.rank,
    }));

    const articles: SearchArticleDto[] = articleRows
      .map((row: ISearchArticlesResult) => ({
        id: String(row.id),
        title: row.title,
        source: row.source,
        author: row.author,
        pubDate: row.pubDate,
        snippet: row.snippet,
        rank: row.rank,
      }))
      .filter((article: SearchArticleDto) =>
        matchesDateRange(article.pubDate, filters.dateFrom, filters.dateTo),
      );

    const media: SearchMediaDto[] = mediaRows
      .map((row: ISearchMediaResult) => ({
        id: String(row.id),
        filename: row.filename,
        title: row.title,
        description: row.description,
        filePath: row.filePath,
        fileType: row.fileType,
        snippet: row.snippet,
        rank: row.rank,
      }))
      .filter((item: SearchMediaDto) => matchesTextFilter(item.fileType, filters.mediaType));

    return {
      entities,
      documents,
      investigations,
      articles,
      media,
      didYouMean: [],
      semanticCapability: capability,
      requestedMode: isSemanticOnly ? 'semantic' : isHybrid ? 'hybrid' : 'lexical',
      effectiveMode,
    };
  },

  searchSentences: async (query: string, limit: number = 20) => {
    const searchTerm = query.trim();
    if (!searchTerm) return [];

    const safeLimit = Math.min(100, Math.max(1, limit));

    try {
      const rows = await searchQueries.searchSentences.run(
        { searchTerm, limit: safeLimit },
        getApiPool(),
      );
      return rows;
    } catch (error) {
      logger.error({ err: error }, '[searchRepository] searchSentences error');
      return [];
    }
  },
};
