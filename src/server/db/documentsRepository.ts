import { documentsQueries } from '@epstein/db';
import { getApiPool } from './connection.js';
import { CacheKeys, queryCache } from '../cache/cacheService.js';
import type { SharedDocumentDto } from '@shared/dto/connections';

const PREVIEW_MAX_CHARS = 320;

const OCR_NOISE_PATTERNS = [
  /textify-ocr/gi,
  /temp[-_]/gi,
  /\bEFTA\d{3,}\b/g,
  /\b[A-Z]{2,}\d{4,}\b/g,
  /[_]{2,}/g,
];

const deriveHumanTitle = (rawTitle: string): string => {
  const stripped = rawTitle
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/^thumb\s+/i, '')
    .replace(/textify-ocr/gi, ' ')
    .replace(/temp[-_]/gi, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\d{6,}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!stripped) return 'Untitled document';

  const lower = stripped.toLowerCase();
  if (/^ai\s*\d*$/i.test(stripped)) return 'Unlabeled generated image';
  if (lower.startsWith('img ') && /\d/.test(lower)) return 'Unlabeled image capture';
  if (lower.includes('deposition')) return 'Deposition transcript';
  if (lower.includes('flight') && lower.includes('log')) return 'Flight log';
  if (lower.includes('black') && lower.includes('book')) return 'Black book page';
  if (lower.includes('email') || lower.includes('message')) return 'Email correspondence';
  if (lower.includes('doj') || lower.includes('justice')) return 'DOJ filing';
  return stripped.slice(0, 96);
};

const looksLikeJunk = (text: string): boolean => {
  if (!text) return true;
  const sample = text.trim().slice(0, 900);
  if (sample.length < 28) return true;

  const digits = (sample.match(/\d/g) || []).length;
  const letters = (sample.match(/[a-z]/gi) || []).length;
  const underscores = (sample.match(/_/g) || []).length;
  const longRuns = (sample.match(/[A-Za-z0-9]{40,}/g) || []).length;
  const idNoiseHits = OCR_NOISE_PATTERNS.reduce(
    (acc, pattern) => acc + ((sample.match(pattern) || []).length > 0 ? 1 : 0),
    0,
  );
  const words = sample.split(/\s+/).filter(Boolean);
  const alphaWords = words.filter((w) => /[a-z]{3,}/i.test(w)).length;
  const dictishRatio = words.length > 0 ? alphaWords / words.length : 0;
  const symbolNoise = (sample.match(/[|~`^<>]{2,}/g) || []).length;

  return (
    underscores / sample.length > 0.035 ||
    digits > letters * 2.5 ||
    longRuns > 0 ||
    idNoiseHits >= 2 ||
    dictishRatio < 0.25 ||
    symbolNoise > 0
  );
};

const firstMeaningfulExcerpt = (text: string): string => {
  const paragraphs = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 35);

  const candidate =
    paragraphs.find((line) => !looksLikeJunk(line)) || text.slice(0, PREVIEW_MAX_CHARS);
  return candidate.slice(0, PREVIEW_MAX_CHARS).trim();
};

type DocumentMetadata = Record<string, unknown>;
type DocumentRow = Record<string, unknown> & {
  id?: string | number;
  title?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  fileType?: string | null;
  fileSize?: string | number | null;
  dateCreated?: string | Date | null;
  extractedDate?: string | Date | null;
  evidenceType?: string | null;
  content?: string | null;
  contentRefined?: string | null;
  contentPreview?: string | null;
  contentRaw?: string | null;
  cleanedText?: string | null;
  metadata?: unknown;
  metadataJson?: unknown;
  aiSummary?: string | null;
  redFlagRating?: string | number | null;
  wordCount?: string | number | null;
  significanceScore?: string | number | null;
  source_collection?: string | null;
  unredactionAttempted?: boolean | null;
  unredactionSucceeded?: boolean | null;
  redactionCoverageBefore?: string | number | null;
  redactionCoverageAfter?: string | number | null;
  unredactedTextGain?: string | number | null;
  unredactionBaselineVocab?: unknown;
};

interface RedactionSpanRow {
  id: string | number;
  document_id: string | number;
}

interface ClaimTripleRow {
  id: string | number;
  document_id: string | number | null;
}

interface DocumentSentenceRow {
  id: string | number;
}

interface RelatedDocumentRow {
  id: string | number;
  title?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  evidenceType?: string | null;
  redFlagRating?: string | number | null;
  dateCreated?: string | Date | null;
  sharedEntityCount?: string | number | null;
  sharedEntitiesList?: string | null;
}

const parseMetadata = (value: unknown): DocumentMetadata => {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null ? (parsed as DocumentMetadata) : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' && value !== null ? (value as DocumentMetadata) : {};
};

const normalizeSourceType = (evidenceType?: string | null, fileType?: string | null): string => {
  const value = (evidenceType || fileType || 'document').toLowerCase();
  if (value.includes('email')) return 'Email';
  if (value.includes('legal')) return 'Legal';
  if (value.includes('deposition')) return 'Deposition';
  if (value.includes('photo') || value.includes('image')) return 'Photo';
  if (value.includes('financial')) return 'Financial';
  if (value.includes('flight')) return 'Flight';
  return 'Document';
};

const buildPreview = (doc: {
  title?: string | null;
  fileName?: string | null;
  contentRefined?: string | null;
  contentPreview?: string | null;
  contentRaw?: string | null;
  metadata?: DocumentMetadata;
}) => {
  const curatedTitle =
    typeof doc.title === 'string' && doc.title.trim() && doc.title !== doc.fileName
      ? doc.title.trim()
      : '';
  const title = curatedTitle || deriveHumanTitle(doc.fileName || 'Untitled document');

  const refined = (doc.contentRefined || '').trim();
  const preview = (doc.contentPreview || '').trim();
  const raw = (doc.contentRaw || '').trim();
  const aiSummary =
    (typeof doc.metadata?.ai_summary === 'string' && doc.metadata.ai_summary.trim()) ||
    (typeof doc.metadata?.summary === 'string' && doc.metadata.summary.trim()) ||
    '';
  const metaText =
    (typeof doc.metadata?.extracted_text === 'string' && doc.metadata.extracted_text.trim()) ||
    (typeof doc.metadata?.body_clean_text === 'string' && doc.metadata.body_clean_text.trim()) ||
    '';

  // Best-quality first: refined → ai_summary → preview → raw → metadata text
  if (refined && !looksLikeJunk(refined)) {
    return { title, previewText: firstMeaningfulExcerpt(refined), previewKind: 'excerpt' as const };
  }
  if (aiSummary) {
    return {
      title,
      previewText: aiSummary.slice(0, PREVIEW_MAX_CHARS),
      previewKind: 'ai_summary' as const,
    };
  }
  if (preview && !looksLikeJunk(preview)) {
    return { title, previewText: firstMeaningfulExcerpt(preview), previewKind: 'excerpt' as const };
  }
  if (raw && !looksLikeJunk(raw)) {
    return { title, previewText: firstMeaningfulExcerpt(raw), previewKind: 'excerpt' as const };
  }
  if (metaText && !looksLikeJunk(metaText)) {
    return {
      title,
      previewText: firstMeaningfulExcerpt(metaText),
      previewKind: 'excerpt' as const,
    };
  }

  // Any text is better than nothing — show first lines even if noisy OCR
  const anyText = (refined || preview || raw || metaText).trim();
  if (anyText) {
    const truncated =
      anyText.slice(0, 160).replace(/\s+/g, ' ').trim() + (anyText.length > 160 ? '...' : '');
    return { title, previewText: truncated, previewKind: 'fallback' as const };
  }

  return { title, previewText: '', previewKind: 'fallback' as const };
};

export const documentsRepository = {
  getDocuments: async (
    page: number = 1,
    limit: number = 50,
    filters: {
      search?: string;
      fileType?: string;
      evidenceType?: string;
      source?: string;
      startDate?: string;
      endDate?: string;
      hasFailedRedactions?: boolean;
      minRedFlag?: number;
      maxRedFlag?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      collectionId?: string;
      includeMedia?: boolean;
      excludedFileTypes?: string[];
    } = {},
  ) => {
    const offset = (page - 1) * limit;
    const search = filters.search?.trim() || null;
    const fileTypes =
      filters.fileType && filters.fileType !== 'all' ? filters.fileType.split(',') : null;
    const sources =
      filters.source && filters.source !== 'all'
        ? filters.source.split(',').map((s) => s.trim())
        : null;

    const evidenceType =
      filters.evidenceType && filters.evidenceType !== 'all' ? filters.evidenceType : null;
    const fullTextSearch = search || null;
    const requestedSortBy = filters.sortBy || 'red_flag';
    const sortBy =
      requestedSortBy === 'relevance' && !fullTextSearch ? 'red_flag' : requestedSortBy;
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const orderByClause =
      sortBy === 'relevance' && fullTextSearch
        ? `ts_rank_cd(fts_vector, websearch_to_tsquery('english', $11::text), 32) ${sortOrder}, red_flag_rating DESC, COALESCE(extracted_date, date_created) DESC`
        : sortBy === 'date'
          ? `COALESCE(extracted_date, date_created) ${sortOrder}, red_flag_rating DESC`
          : sortBy === 'title'
            ? `COALESCE(NULLIF(title, ''), file_name) ${sortOrder}, COALESCE(extracted_date, date_created) DESC`
            : sortBy === 'fileType'
              ? `file_type ${sortOrder} NULLS LAST, COALESCE(NULLIF(title, ''), file_name) ASC`
              : sortBy === 'size'
                ? `file_size ${sortOrder} NULLS LAST, COALESCE(extracted_date, date_created) DESC`
                : sortBy === 'significance'
                  ? `significance_score DESC NULLS LAST, red_flag_rating DESC, COALESCE(extracted_date, date_created) DESC`
                  : `red_flag_rating ${sortOrder}, COALESCE(extracted_date, date_created) DESC`;

    // Support indexed content search directly in the document browser.
    const docsSql = `
      WITH base AS (
        SELECT
          id,
          file_name as "fileName",
          file_type as "fileType",
          file_size as "fileSize",
          date_created as "dateCreated",
          extracted_date as "extractedDate",
          content_refined as "contentRefined",
          content_preview as "contentPreview",
          LEFT(content, 600) as "contentRaw",
          evidence_type as "evidenceType",
          metadata_json as "metadata",
          word_count as "wordCount",
          red_flag_rating as "redFlagRating",
          COALESCE(NULLIF(title, ''), file_name) as "title",
          source_collection as "sourceCollection",
          significance_score as "significanceScore",
          unredaction_attempted as "unredactionAttempted",
          unredaction_succeeded as "unredactionSucceeded",
          redaction_coverage_before as "redactionCoverageBefore",
          redaction_coverage_after as "redactionCoverageAfter",
          unredacted_text_gain as "unredactedTextGain"
        FROM documents
        WHERE (
            $1::text IS NULL
            OR file_name ILIKE $1
            OR source_collection ILIKE $1
            OR file_path ILIKE $1
            OR fts_vector @@ websearch_to_tsquery('english', $11::text)
          )
          AND (file_type = ANY($2::text[]) OR $2::text[] IS NULL)
          AND (evidence_type = $3::text OR $3::text IS NULL)
          AND (source_collection = ANY($4::text[]) OR $4::text[] IS NULL)
          AND (COALESCE(extracted_date, date_created) >= $5::timestamp OR $5::timestamp IS NULL)
          AND (COALESCE(extracted_date, date_created) <= $6::timestamp OR $6::timestamp IS NULL)
          AND (red_flag_rating >= $7::int OR $7::int IS NULL)
          AND (red_flag_rating <= $8::int OR $8::int IS NULL)
          AND (
            $12::boolean = true
            OR (
              COALESCE(evidence_type, '') != 'media'
              AND file_type NOT LIKE 'image/%'
              AND file_type NOT LIKE 'video/%'
              AND file_type NOT LIKE 'audio/%'
            )
          )
          AND (file_type != ALL($13::text[]) OR $13::text[] IS NULL)
          AND (
            $14::boolean IS NULL
            OR $14::boolean = false
            OR (
              COALESCE(has_failed_redactions::int, 0) > 0
              OR failed_redaction_count > 0
              OR redaction_coverage_after IS NOT NULL
              OR EXISTS (
                SELECT 1 FROM redaction_spans rs WHERE rs.document_id = documents.id
              )
            )
          )
        ORDER BY ${orderByClause}
        LIMIT $9::int OFFSET $10::int
      )
      SELECT
        base.*,
        ai.output_text as "aiSummary"
      FROM base
      LEFT JOIN LATERAL (
        SELECT output_text
        FROM document_ai_artifacts daa
        WHERE daa.document_id = base.id
          AND daa.artifact_type = 'summary'
          AND daa.output_text IS NOT NULL
        ORDER BY daa.created_at DESC
        LIMIT 1
      ) ai ON TRUE
    `;
    const countSql = `
      SELECT COUNT(*) as total
      FROM documents
      WHERE (
          $1::text IS NULL
          OR file_name ILIKE $1
          OR source_collection ILIKE $1
          OR file_path ILIKE $1
          OR fts_vector @@ websearch_to_tsquery('english', $9::text)
        )
        AND (file_type = ANY($2::text[]) OR $2::text[] IS NULL)
        AND (evidence_type = $3::text OR $3::text IS NULL)
        AND (source_collection = ANY($4::text[]) OR $4::text[] IS NULL)
        AND (COALESCE(extracted_date, date_created) >= $5::timestamp OR $5::timestamp IS NULL)
        AND (COALESCE(extracted_date, date_created) <= $6::timestamp OR $6::timestamp IS NULL)
        AND (red_flag_rating >= $7::int OR $7::int IS NULL)
        AND (red_flag_rating <= $8::int OR $8::int IS NULL)
        AND (
          $10::boolean = true
          OR (
            COALESCE(evidence_type, '') != 'media'
            AND file_type NOT LIKE 'image/%'
            AND file_type NOT LIKE 'video/%'
            AND file_type NOT LIKE 'audio/%'
          )
        )
        AND (file_type != ALL($11::text[]) OR $11::text[] IS NULL)
        AND (
          $12::boolean IS NULL
          OR $12::boolean = false
          OR (
            COALESCE(has_failed_redactions::int, 0) > 0
            OR failed_redaction_count > 0
            OR redaction_coverage_after IS NOT NULL
            OR EXISTS (
              SELECT 1 FROM redaction_spans rs WHERE rs.document_id = documents.id
            )
          )
        )
    `;

    const pool = getApiPool();
    const docsRes = await pool.query({
      name: 'documents.getDocuments.list',
      text: docsSql,
      values: [
        search ? `%${search}%` : null,
        fileTypes,
        evidenceType,
        sources,
        filters.startDate || null,
        filters.endDate || null,
        filters.minRedFlag ?? null,
        filters.maxRedFlag ?? null,
        limit,
        offset,
        fullTextSearch,
        !!filters.includeMedia,
        filters.excludedFileTypes || null,
        filters.hasFailedRedactions ?? null,
      ],
    });

    const docs = docsRes.rows as DocumentRow[];
    const shouldUseCachedCount =
      !search &&
      !fileTypes &&
      !evidenceType &&
      !sources &&
      !filters.startDate &&
      !filters.endDate &&
      filters.minRedFlag === undefined &&
      filters.maxRedFlag === undefined &&
      filters.hasFailedRedactions === undefined &&
      !filters.includeMedia &&
      (!filters.excludedFileTypes || filters.excludedFileTypes.length === 0);

    let total = 0;
    try {
      const countResult = shouldUseCachedCount
        ? await queryCache.getOrSetAsync(
            CacheKeys.documentCount(),
            async () => {
              const res = await pool.query<{ total: string | number }>({
                name: 'documents.getDocuments.count.cached',
                text: countSql,
                values: [null, null, null, null, null, null, null, null, null, false, null, null],
              });
              return Number(res.rows[0]?.total ?? 0);
            },
            120,
          )
        : await (async () => {
            const res = await pool.query<{ total: string | number }>({
              name: 'documents.getDocuments.count',
              text: countSql,
              values: [
                search ? `%${search}%` : null,
                fileTypes,
                evidenceType,
                sources,
                filters.startDate || null,
                filters.endDate || null,
                filters.minRedFlag ?? null,
                filters.maxRedFlag ?? null,
                fullTextSearch,
                !!filters.includeMedia,
                filters.excludedFileTypes || null,
                filters.hasFailedRedactions ?? null,
              ],
            });
            return Number(res.rows[0]?.total ?? 0);
          })();
      total = Number(countResult ?? 0);
    } catch {
      total = Math.max(offset + docs.length, 0);
    }

    // Batch-fetch top entities for all documents in a single query (eliminates N+1)
    const docIds = docs.map((d) => Number(d.id));
    const entityRowsByDocId = new Map<
      number,
      Array<{ id: string; name: string; mentions: number }>
    >();
    if (docIds.length > 0) {
      const entitiesBatchSql = `
        SELECT
          em.document_id as "documentId",
          e.id,
          e.full_name as "name",
          COUNT(*) as "mentions"
        FROM entity_mentions em
        JOIN entities e ON e.id = em.entity_id
        WHERE em.document_id = ANY($1::bigint[])
        GROUP BY em.document_id, e.id, e.full_name
        ORDER BY "mentions" DESC
      `;
      const entityBatchRes = await getApiPool().query(entitiesBatchSql, [docIds]);
      for (const row of entityBatchRes.rows) {
        const docId = Number(row.documentId);
        if (!entityRowsByDocId.has(docId)) entityRowsByDocId.set(docId, []);
        entityRowsByDocId.get(docId)!.push({
          id: String(row.id),
          name: row.name || 'Unknown',
          mentions: Number(row.mentions),
        });
      }
    }

    const transformedDocs = docs.map((doc) => {
      const title = typeof doc.title === 'string' ? doc.title : undefined;
      const fileName = typeof doc.fileName === 'string' ? doc.fileName : undefined;
      const contentRefined =
        typeof doc.contentRefined === 'string' ? doc.contentRefined : undefined;
      const evidenceType = typeof doc.evidenceType === 'string' ? doc.evidenceType : undefined;
      const fileType = typeof doc.fileType === 'string' ? doc.fileType : undefined;
      const metadata = parseMetadata(doc.metadata);
      const aiSummary = typeof doc.aiSummary === 'string' ? doc.aiSummary.trim() : '';
      const hasMetaSummary =
        (typeof metadata.ai_summary === 'string' && metadata.ai_summary.trim()) ||
        (typeof metadata.summary === 'string' && metadata.summary.trim());
      if (aiSummary && !hasMetaSummary) {
        metadata.ai_summary = aiSummary;
      }
      const preview = buildPreview({
        title,
        fileName,
        contentRefined,
        contentPreview: typeof doc.contentPreview === 'string' ? doc.contentPreview : '',
        contentRaw: typeof doc.contentRaw === 'string' ? doc.contentRaw : '',
        metadata,
      });

      const entities = entityRowsByDocId.get(Number(doc.id)) || [];
      const entityCount = entities.reduce((acc, e) => acc + e.mentions, 0);
      const keyEntities = entities.slice(0, 3).map((e) => ({ id: e.id, name: e.name }));

      const sourceType = normalizeSourceType(evidenceType, fileType);
      const whyFlagged =
        entityCount >= 8
          ? `High significance from dense entity mentions (${entityCount}).`
          : Number(doc.redFlagRating || 0) >= 4
            ? 'High significance due to elevated risk scoring.'
            : 'High significance due to risk scoring and entity density.';

      return {
        id: String(doc.id),
        fileName,
        title: preview.title,
        fileType,
        fileSize: Number(doc.fileSize || 0),
        dateCreated: doc.dateCreated,
        extractedDate: doc.extractedDate,
        evidenceType: evidenceType || 'document',
        metadata,
        aiSummary: aiSummary || null,
        redFlagRating: Number(doc.redFlagRating || 0),
        wordCount: Number(doc.wordCount || 0),
        significanceScore: doc.significanceScore != null ? Number(doc.significanceScore) : null,
        unredactionAttempted: Boolean(doc.unredactionAttempted),
        unredactionSucceeded: Boolean(doc.unredactionSucceeded),
        redactionCoverageBefore:
          doc.redactionCoverageBefore != null ? Number(doc.redactionCoverageBefore) : null,
        redactionCoverageAfter:
          doc.redactionCoverageAfter != null ? Number(doc.redactionCoverageAfter) : null,
        unredactedTextGain: doc.unredactedTextGain != null ? Number(doc.unredactedTextGain) : null,
        entitiesCount: entityCount,
        keyEntities,
        sourceType,
        previewText: preview.previewText,
        previewKind: preview.previewKind,
        whyFlagged,
      };
    });

    return {
      documents: transformedDocs,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  getDocumentById: async (id: string): Promise<Record<string, unknown> | null> => {
    const docId = Number(id);
    const rows = await documentsQueries.getDocumentById.run({ id: docId }, getApiPool());
    let document = rows[0] ? ({ ...rows[0] } as DocumentRow) : undefined;

    if (!document) {
      try {
        const mediaRes = await getApiPool().query(
          `SELECT id, file_name as "fileName", file_path as "filePath", file_type as "fileType", file_size as "fileSize", created_at as "dateCreated", metadata_json as "metadataJson"
           FROM media_items WHERE id = $1`,
          [docId],
        );
        if (mediaRes.rows.length > 0) {
          const m = mediaRes.rows[0];
          document = {
            id: m.id,
            fileName: m.fileName,
            filePath: m.filePath,
            fileType: m.fileType,
            fileSize: m.fileSize,
            dateCreated: m.dateCreated,
            extractedDate: m.dateCreated,
            metadataJson: m.metadataJson,
            title: m.fileName,
            evidenceType: 'media',
            content:
              m.metadataJson?.extracted_text ||
              m.metadataJson?.ocr_text ||
              m.metadataJson?.content ||
              '',
            contentRefined: m.metadataJson?.refined_text || m.metadataJson?.extracted_text || '',
          } as unknown as DocumentRow;
        }
      } catch (_err) {
        // graceful fallback
      }
    }

    if (!document) return null;

    const metadata = parseMetadata(document.metadataJson);

    let aiSummary: string | null = null;
    try {
      const aiRes = await getApiPool().query<{ output_text: string | null }>(
        `
          SELECT output_text
          FROM document_ai_artifacts
          WHERE document_id = $1::bigint
            AND artifact_type = 'summary'
            AND output_text IS NOT NULL
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [docId],
      );
      const raw = aiRes.rows[0]?.output_text;
      aiSummary = typeof raw === 'string' && raw.trim() ? raw.trim() : null;
    } catch {
      aiSummary = null;
    }

    const hasMetaSummary =
      (typeof metadata.ai_summary === 'string' && metadata.ai_summary.trim()) ||
      (typeof metadata.summary === 'string' && metadata.summary.trim());
    if (aiSummary && !hasMetaSummary) {
      metadata.ai_summary = aiSummary;
    }

    let entityRowsRes;
    try {
      entityRowsRes = await getApiPool().query(
        `
        SELECT
          e.id as "entityId",
          e.full_name as "name",
          e.entity_type as "entityType",
          COUNT(em.id) as "mentions",
          (
            SELECT f.crop_path
            FROM face_clusters fc
            JOIN faces f ON f.id = fc.representative_face_id
            WHERE fc.name = e.full_name AND fc.is_hidden = false
            LIMIT 1
          ) as "thumbnailPath"
        FROM entity_mentions em
        JOIN entities e ON em.entity_id = e.id
        WHERE em.document_id = $1
        GROUP BY e.id, e.full_name, e.entity_type
        ORDER BY "mentions" DESC
        `,
        [docId],
      );
    } catch (error: unknown) {
      // Face table migrations may not exist in some deployments; degrade gracefully.
      if ((error as NodeJS.ErrnoException)?.code !== '42P01') throw error;
      entityRowsRes = await getApiPool().query(
        `
        SELECT
          e.id as "entityId",
          e.full_name as "name",
          e.entity_type as "entityType",
          COUNT(em.id) as "mentions",
          NULL::text as "thumbnailPath"
        FROM entity_mentions em
        JOIN entities e ON em.entity_id = e.id
        WHERE em.document_id = $1
        GROUP BY e.id, e.full_name, e.entity_type
        ORDER BY "mentions" DESC
        `,
        [docId],
      );
    }
    interface EntityRow {
      entityId: string | number;
      name: string;
      entityType: string;
      mentions: string | number;
      thumbnailPath: string | null;
    }
    const entityRows: EntityRow[] = entityRowsRes.rows;

    // Batch all mention-context fetches into a single query to avoid N+1
    const entityIds = entityRows.map((r) => Number(r.entityId));
    const contextsByEntityId = new Map<number, string[]>();
    if (entityIds.length > 0) {
      const batchContextSql = `
        SELECT entity_id, mention_context
        FROM entity_mentions
        WHERE document_id = $1
          AND entity_id = ANY($2::int[])
          AND mention_context IS NOT NULL
          AND mention_context != ''
        ORDER BY entity_id, id
        LIMIT 200
      `;
      const batchCtxRes = await getApiPool().query(batchContextSql, [docId, entityIds]);
      for (const row of batchCtxRes.rows) {
        const eid = Number(row.entity_id);
        if (!contextsByEntityId.has(eid)) contextsByEntityId.set(eid, []);
        const existing = contextsByEntityId.get(eid)!;
        if (existing.length < 3) existing.push(row.mention_context);
      }
    }

    const entities = entityRows.map((row) => {
      const eid = Number(row.entityId);
      const significance =
        Number(row.mentions) >= 20
          ? 'high'
          : Number(row.mentions) >= 5
            ? 'medium'
            : ('low' as const);
      const contextStrings = contextsByEntityId.get(eid) || [];
      return {
        id: eid,
        name: row.name,
        type: row.entityType,
        mentions: Number(row.mentions),
        significance,
        thumbnail_path: row.thumbnailPath,
        contexts: contextStrings.map((ctx) => ({
          context: ctx,
          source: document.source_collection || 'Document',
        })),
      };
    });

    const redactionSpans = (await documentsQueries.getRedactionSpans.run(
      { documentId: docId },
      getApiPool(),
    )) as RedactionSpanRow[];
    const claims = (await documentsQueries.getClaimTriples.run(
      { documentId: docId },
      getApiPool(),
    )) as ClaimTripleRow[];
    const sentences = (await documentsQueries.getDocumentSentences.run(
      { documentId: docId },
      getApiPool(),
    )) as DocumentSentenceRow[];

    const rawContent = (typeof document.content === 'string' ? document.content : '').trim();
    const refinedContent =
      typeof document.contentRefined === 'string' ? document.contentRefined.trim() : '';

    let derivedContent = rawContent;
    if (!derivedContent) {
      // Some production schemas use document_pages.content instead of extracted_text.
      // Prefer extracted_text when available, then gracefully fall back.
      try {
        const pageTextRes = await getApiPool().query<{ combined_text: string | null }>(
          `
          SELECT STRING_AGG(dp.extracted_text, E'\n\n' ORDER BY dp.page_number) AS combined_text
          FROM document_pages dp
          WHERE dp.document_id = $1
            AND dp.extracted_text IS NOT NULL
            AND BTRIM(dp.extracted_text) <> ''
          `,
          [docId],
        );
        derivedContent = (pageTextRes.rows[0]?.combined_text || '').trim();
      } catch (error: unknown) {
        if (!['42703', '42P01'].includes(String((error as NodeJS.ErrnoException)?.code || '')))
          throw error;
      }

      if (!derivedContent) {
        try {
          const legacyPageTextRes = await getApiPool().query<{ combined_text: string | null }>(
            `
            SELECT STRING_AGG(dp.content, E'\n\n' ORDER BY dp.page_number) AS combined_text
            FROM document_pages dp
            WHERE dp.document_id = $1
              AND dp.content IS NOT NULL
              AND BTRIM(dp.content) <> ''
            `,
            [docId],
          );
          derivedContent = (legacyPageTextRes.rows[0]?.combined_text || '').trim();
        } catch (error: unknown) {
          if (!['42703', '42P01'].includes(String((error as NodeJS.ErrnoException)?.code || '')))
            throw error;
        }
      }

      if (!derivedContent) {
        const sentenceTextRes = await getApiPool().query<{ combined_text: string | null }>(
          `
          SELECT STRING_AGG(ds.sentence_text, ' ' ORDER BY ds.sentence_index) AS combined_text
          FROM document_sentences ds
          WHERE ds.document_id = $1
            AND ds.sentence_text IS NOT NULL
            AND BTRIM(ds.sentence_text) <> ''
          `,
          [docId],
        );
        derivedContent = (sentenceTextRes.rows[0]?.combined_text || '').trim();
      }

      if (!derivedContent) {
        try {
          const mediaRes = await getApiPool().query<{ text: string | null }>(
            `
            SELECT
              COALESCE(
                metadata_json->>'extracted_text',
                metadata_json->>'ocr_text',
                metadata_json->>'ocrText',
                metadata_json->>'content'
              ) AS text
            FROM media_items
            WHERE id = $1 OR file_path = $2
            `,
            [docId, document.filePath],
          );
          derivedContent = (mediaRes.rows[0]?.text || '').trim();
        } catch (_err) {
          // graceful fallback
        }
      }

      if (!derivedContent && document.metadataJson) {
        try {
          const parsedMeta =
            typeof document.metadataJson === 'string'
              ? JSON.parse(document.metadataJson)
              : document.metadataJson;
          derivedContent = (
            parsedMeta?.extracted_text ||
            parsedMeta?.ocr_text ||
            parsedMeta?.ocrText ||
            parsedMeta?.content ||
            ''
          ).trim();
        } catch (_err) {
          // ignore
        }
      }
    }

    const normalizedDocument = {
      ...document,
      id: String(document.id),
      fileName: document.fileName,
      filePath: document.filePath,
      fileType: document.fileType,
      fileSize: Number(document.fileSize || 0),
      dateCreated: document.dateCreated,
      extractedDate: document.extractedDate,
      evidenceType: document.evidenceType || 'document',
      content: derivedContent,
      contentRefined: refinedContent || derivedContent,
      metadata,
      aiSummary,
      redFlagRating: Number(document.redFlagRating || 0),
      wordCount: Number(
        document.wordCount || (derivedContent ? derivedContent.split(/\s+/).length : 0),
      ),
    };

    // Fetch associated forensic signals
    const signalRowsRes = await getApiPool().query(
      `
      SELECT
        fs.id,
        fs.signal_type as "signalType",
        fs.confidence,
        fs.risk_score as "riskScore",
        fs.metadata_json as "metadata",
        ARRAY(
          SELECT e.full_name
          FROM forensic_signal_entities fse
          JOIN entities e ON e.id = fse.entity_id
          WHERE fse.signal_id = fs.id
        ) as "entityNames"
      FROM forensic_signals fs
      WHERE fs.id IN (
        SELECT signal_id FROM forensic_signal_evidence WHERE document_id = $1
      )
      ORDER BY fs.risk_score DESC
      `,
      [docId],
    );

    const signals = signalRowsRes.rows.map((row) => ({
      id: row.id,
      type: row.signalType,
      confidence: row.confidence,
      riskScore: row.riskScore,
      metadata: row.metadata,
      entities: row.entityNames,
    }));

    return {
      ...normalizedDocument,
      source_collection: 'Epstein Files',
      entities,
      mentionedEntities: entities,
      signals,
      redaction_spans: redactionSpans.map((s) => ({
        ...s,
        id: Number(s.id),
        document_id: Number(s.document_id),
      })),
      claims: claims.map((c) => ({
        ...c,
        id: Number(c.id),
        document_id: Number(c.document_id),
      })),
      sentences: sentences.map((s) => ({
        ...s,
        id: Number(s.id),
        document_id: docId,
      })),
      unredaction_metrics: {
        attempted: Boolean(document.unredactionAttempted),
        succeeded: Boolean(document.unredactionSucceeded),
        redactionCoverageBefore: document.redactionCoverageBefore,
        redactionCoverageAfter: document.redactionCoverageAfter,
        unredactedTextGain: document.unredactedTextGain,
        baselineVocab: document.unredactionBaselineVocab || null,
      },
    };
  },

  getRelatedDocuments: async (documentId: string, limit: number = 10) => {
    const docId = Number(documentId);
    const related = (await documentsQueries.getRelatedDocuments.run(
      { documentId: docId, limit },
      getApiPool(),
    )) as RelatedDocumentRow[];

    return related.map((doc) => ({
      id: String(doc.id),
      title: doc.title,
      fileName: doc.fileName,
      fileType: doc.fileType,
      evidenceType: doc.evidenceType || 'document',
      redFlagRating: Number(doc.redFlagRating || 0),
      dateCreated: doc.dateCreated,
      sharedCount: Number(doc.sharedEntityCount),
      reasons: (doc.sharedEntitiesList || '')
        .split(',')
        .slice(0, 3)
        .map((name: string) => `Shared entity: ${name.trim()}`),
      sharedEntities: (doc.sharedEntitiesList || '')
        .split(',')
        .map((s: string) => s.trim())
        .slice(0, 5),
    }));
  },

  getSharedDocuments: async (
    entityAId: number,
    entityBId: number,
  ): Promise<SharedDocumentDto[]> => {
    const res = await getApiPool().query(
      `
      SELECT DISTINCT
        d.id::text as id,
        COALESCE(d.title, d.file_name, 'Untitled') as title,
        d.evidence_type as "evidenceType",
        d.created_at as date,
        d.word_count as "wordCount"
      FROM documents d
      JOIN entity_mentions em1 ON em1.document_id = d.id AND em1.entity_id = $1
      JOIN entity_mentions em2 ON em2.document_id = d.id AND em2.entity_id = $2
      ORDER BY d.created_at DESC
      LIMIT 50
      `,
      [entityAId, entityBId],
    );
    return res.rows.map((r) => ({
      id: String(r.id),
      title: String(r.title ?? 'Untitled'),
      evidenceType: r.evidenceType ?? null,
      date: r.date ? String(r.date) : null,
      wordCount: r.wordCount ? Number(r.wordCount) : null,
    }));
  },
};
