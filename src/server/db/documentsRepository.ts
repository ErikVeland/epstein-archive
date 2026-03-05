import { documentsQueries } from '@epstein/db';
import { getApiPool } from './connection.js';

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
    .replace(/textify-ocr/gi, ' ')
    .replace(/temp[-_]/gi, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\d{6,}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!stripped) return 'Untitled document';

  const lower = stripped.toLowerCase();
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
  const longRuns = (sample.match(/[A-Za-z0-9]{32,}/g) || []).length;
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
    digits > letters * 1.1 ||
    longRuns > 0 ||
    idNoiseHits >= 2 ||
    dictishRatio < 0.42 ||
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
  cleanedText?: string | null;
  contentPreview?: string | null;
  metadata?: Record<string, any>;
}) => {
  const curatedTitle =
    typeof doc.title === 'string' && doc.title.trim() && doc.title !== doc.fileName
      ? doc.title.trim()
      : '';
  const title = curatedTitle || deriveHumanTitle(doc.fileName || 'Untitled document');

  const refined = (doc.contentRefined || '').trim();
  const cleaned = (doc.cleanedText || '').trim();
  const raw = (doc.contentPreview || '').trim();
  const aiSummary =
    (typeof doc.metadata?.ai_summary === 'string' && doc.metadata.ai_summary.trim()) ||
    (typeof doc.metadata?.summary === 'string' && doc.metadata.summary.trim()) ||
    '';

  if (refined && !looksLikeJunk(refined)) {
    return { title, previewText: firstMeaningfulExcerpt(refined), previewKind: 'excerpt' as const };
  }
  if (cleaned && !looksLikeJunk(cleaned)) {
    return { title, previewText: firstMeaningfulExcerpt(cleaned), previewKind: 'excerpt' as const };
  }
  if (aiSummary) {
    return {
      title,
      previewText: aiSummary.slice(0, PREVIEW_MAX_CHARS),
      previewKind: 'ai_summary' as const,
    };
  }
  if (raw && !looksLikeJunk(raw)) {
    return { title, previewText: firstMeaningfulExcerpt(raw), previewKind: 'excerpt' as const };
  }

  return {
    title,
    previewText: 'OCR-heavy document; open to view extracted text.',
    previewKind: 'fallback' as const,
  };
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
    const sortBy = filters.sortBy || 'red_flag';

    const docsSql = `
      SELECT
        id,
        file_name as "fileName",
        file_type as "fileType",
        file_size as "fileSize",
        date_created as "dateCreated",
        extracted_date as "extractedDate",
        content_refined as "contentRefined",
        evidence_type as "evidenceType",
        metadata_json as "metadata",
        word_count as "wordCount",
        red_flag_rating as "redFlagRating",
        COALESCE(NULLIF(title, ''), file_name) as "title",
        source_collection as "sourceCollection"
      FROM documents
      WHERE ($1::text IS NULL OR file_name ILIKE $1 OR content_refined ILIKE $1 OR source_collection ILIKE $1 OR file_path ILIKE $1)
        AND (file_type = ANY($2::text[]) OR $2::text[] IS NULL)
        AND (evidence_type = $3::text OR $3::text IS NULL)
        AND (source_collection = ANY($4::text[]) OR $4::text[] IS NULL)
        AND (COALESCE(extracted_date, date_created) >= $5::timestamp OR $5::timestamp IS NULL)
        AND (COALESCE(extracted_date, date_created) <= $6::timestamp OR $6::timestamp IS NULL)
        AND (red_flag_rating >= $7::int OR $7::int IS NULL)
        AND (red_flag_rating <= $8::int OR $8::int IS NULL)
      ORDER BY
        CASE WHEN $9::text = 'date' THEN COALESCE(extracted_date, date_created) END DESC,
        CASE WHEN $9::text = 'title' THEN file_name END ASC,
        CASE WHEN $9::text = 'red_flag' OR $9::text IS NULL THEN red_flag_rating END DESC,
        COALESCE(extracted_date, date_created) DESC
      LIMIT $10::int OFFSET $11::int
    `;
    const docsRes = await getApiPool().query(docsSql, [
      search ? `%${search}%` : null,
      fileTypes,
      evidenceType,
      sources,
      filters.startDate || null,
      filters.endDate || null,
      filters.minRedFlag ?? null,
      filters.maxRedFlag ?? null,
      sortBy,
      limit,
      offset,
    ]);
    const docs = docsRes.rows as any[];

    const countSql = `
      SELECT COUNT(*) as total
      FROM documents
      WHERE ($1::text IS NULL OR file_name ILIKE $1 OR content_refined ILIKE $1 OR source_collection ILIKE $1 OR file_path ILIKE $1)
        AND (file_type = ANY($2::text[]) OR $2::text[] IS NULL)
        AND (evidence_type = $3::text OR $3::text IS NULL)
        AND (source_collection = ANY($4::text[]) OR $4::text[] IS NULL)
        AND (COALESCE(extracted_date, date_created) >= $5::timestamp OR $5::timestamp IS NULL)
        AND (COALESCE(extracted_date, date_created) <= $6::timestamp OR $6::timestamp IS NULL)
        AND (red_flag_rating >= $7::int OR $7::int IS NULL)
        AND (red_flag_rating <= $8::int OR $8::int IS NULL)
    `;
    const countResultRes = await getApiPool().query(countSql, [
      search ? `%${search}%` : null,
      fileTypes,
      evidenceType,
      sources,
      filters.startDate || null,
      filters.endDate || null,
      filters.minRedFlag ?? null,
      filters.maxRedFlag ?? null,
    ]);
    const countResult = countResultRes.rows as Array<{ total?: string | number | null }>;

    const total = Number(countResult[0]?.total || 0);

    // Batch-fetch top entities for all documents in a single query (eliminates N+1)
    const docIds = docs.map((d) => Number(d.id));
    const entityRowsByDocId = new Map<number, Array<{ name: string; mentions: number }>>();
    if (docIds.length > 0) {
      const entitiesBatchSql = `
        SELECT
          em.document_id as "documentId",
          e.full_name as "name",
          COUNT(*) as "mentions"
        FROM entity_mentions em
        JOIN entities e ON e.id = em.entity_id
        WHERE em.document_id = ANY($1::int[])
        GROUP BY em.document_id, e.id, e.full_name
        ORDER BY "mentions" DESC
      `;
      const entityBatchRes = await getApiPool().query(entitiesBatchSql, [docIds]);
      for (const row of entityBatchRes.rows) {
        const docId = Number(row.documentId);
        if (!entityRowsByDocId.has(docId)) entityRowsByDocId.set(docId, []);
        entityRowsByDocId
          .get(docId)!
          .push({ name: row.name || 'Unknown', mentions: Number(row.mentions) });
      }
    }

    const transformedDocs = docs.map((doc) => {
      const metadata =
        typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : doc.metadata || {};
      const preview = buildPreview({
        title: doc.title,
        fileName: doc.fileName,
        contentRefined: doc.contentRefined,
        contentPreview: (doc as any).contentPreview || '',
        metadata,
      });

      const entities = entityRowsByDocId.get(Number(doc.id)) || [];
      const entityCount = entities.reduce((acc, e) => acc + e.mentions, 0);
      const keyEntities = entities.slice(0, 3).map((e) => e.name);

      const sourceType = normalizeSourceType(doc.evidenceType, doc.fileType);
      const whyFlagged =
        entityCount >= 8
          ? `High significance from dense entity mentions (${entityCount}).`
          : Number(doc.redFlagRating || 0) >= 4
            ? 'High significance due to elevated risk scoring.'
            : 'High significance due to risk scoring and entity density.';

      return {
        id: String(doc.id),
        fileName: doc.fileName,
        title: preview.title,
        fileType: doc.fileType,
        fileSize: Number(doc.fileSize || 0),
        dateCreated: doc.dateCreated,
        extractedDate: doc.extractedDate,
        evidenceType: doc.evidenceType || 'document',
        metadata,
        redFlagRating: Number(doc.redFlagRating || 0),
        wordCount: Number(doc.wordCount || 0),
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

  getDocumentById: async (id: string): Promise<any | null> => {
    const docId = Number(id);
    const rows = await (documentsQueries.getDocumentById as any).run({ id: docId }, getApiPool());
    const document = rows[0];

    if (!document) return null;

    let metadata: any = {};
    if (document.metadataJson && typeof document.metadataJson === 'string') {
      try {
        metadata = JSON.parse(document.metadataJson);
      } catch (_e) {
        metadata = {};
      }
    } else if (document.metadataJson) {
      metadata = document.metadataJson;
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
    } catch (error: any) {
      // Face table migrations may not exist in some deployments; degrade gracefully.
      if (error?.code !== '42P01') throw error;
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
    const entityRows = entityRowsRes.rows;

    // Batch all mention-context fetches into a single query to avoid N+1
    const entityIds = entityRows.map((r: any) => Number(r.entityId));
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

    const entities = entityRows.map((row: any) => {
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
          source: (document as any).source_collection || 'Document',
        })),
      };
    });

    const redactionSpans = await (documentsQueries.getRedactionSpans as any).run(
      { documentId: docId },
      getApiPool(),
    );
    const claims = await (documentsQueries.getClaimTriples as any).run(
      { documentId: docId },
      getApiPool(),
    );
    const sentences = await (documentsQueries.getDocumentSentences as any).run(
      { documentId: docId },
      getApiPool(),
    );

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
      content: document.content || '',
      contentRefined: document.content || '', // In PG version we only have content_refined usually
      metadata,
      redFlagRating: Number(document.redFlagRating || 0),
      wordCount: Number(document.wordCount || 0),
    };

    return {
      ...normalizedDocument,
      source_collection: 'Epstein Files',
      entities,
      mentionedEntities: entities,
      original_file_path: document.originalFilePath || document.filePath,
      redaction_spans: redactionSpans.map((s: any) => ({
        ...s,
        id: Number(s.id),
        document_id: Number(s.document_id),
      })),
      claims: claims.map((c: any) => ({
        ...c,
        id: Number(c.id),
        document_id: Number(c.document_id),
      })),
      sentences: sentences.map((s: any) => ({
        ...s,
        id: Number(s.id),
        document_id: Number(s.document_id),
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
    const related = await (documentsQueries.getRelatedDocuments as any).run(
      { documentId: docId, limit: limit },
      getApiPool(),
    );

    return related.map((doc: any) => ({
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
};
