import { searchQueries } from '@epstein/db';
import { createHash } from 'node:crypto';
import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';
import { buildVipDisplayLookup, resolveCanonicalVipName } from './vipNameResolver.js';
import { getSemanticCapability, SemanticCapability } from '../semantic/capability.js';
import { searchDocumentsSemantic, searchEntitiesSemantic } from '../semantic/search.js';
import { entityQualityWhereSql, isJunkEntityName } from './entityQuality.js';
import { normalMediaEvidenceWhereSql } from './mediaEvidenceScope.js';
import { buildEvidenceCitation, verifyEvidenceCitation } from '../../shared/evidence/citation.js';
import type { SearchPassageResultDto } from '../../shared/dto/search.js';

const normalizeAliasValue = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const canUseEntityFuzzyFallback = (value: string): boolean =>
  value.length <= 80 && /^[\p{L}\p{M}'’., -]+$/u.test(value);

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
          similarity(COALESCE(e.full_name, ''), $2),
          similarity(COALESCE(e.aliases, ''), $2)
        ) AS "similarityScore"
      FROM entities e
      WHERE COALESCE(e.junk_tier, 'clean') = 'clean'
        AND COALESCE(e.quarantine_status, 0) = 0
        AND ${entityQualityWhereSql('e')}
        AND (
          e.full_name ILIKE $1
          OR e.aliases ILIKE $1
          OR e.full_name % $2
          OR e.aliases % $2
        )
      ORDER BY
        CASE
          WHEN LOWER(e.full_name) = LOWER($2) THEN 0
          WHEN LOWER(COALESCE(e.aliases, '')) LIKE '%' || LOWER($2) || '%' THEN 1
          WHEN LOWER(e.full_name) LIKE LOWER($2) || '%' THEN 2
          WHEN GREATEST(
            similarity(COALESCE(e.full_name, ''), $2),
            similarity(COALESCE(e.aliases, ''), $2)
          ) >= 0.3 THEN 3
          ELSE 4
        END,
        "similarityScore" DESC,
        COALESCE(e.red_flag_rating, 0) DESC,
        COALESCE(e.mentions, 0) DESC,
        e.id DESC
      LIMIT $3
    `,
    [partialPattern, normalizedSearchTerm, limit],
  );
}

async function searchEntityLexicalRows(
  searchTerm: string,
  limit: number,
  isPrefix: boolean,
): Promise<EntitySearchRow[]> {
  const queryFn = isPrefix ? 'to_tsquery' : 'websearch_to_tsquery';
  const rankExpr = `ts_rank_cd(e.fts_vector, ${queryFn}('english', $1), 32)`;
  const result = await getApiPool().query<EntitySearchRow>(
    `
      SELECT
        e.id,
        e.full_name AS "fullName",
        e.primary_role AS "primaryRole",
        e.aliases,
        e.red_flag_rating AS "redFlagRating",
        ${rankExpr} AS rank
      FROM entities e
      WHERE e.fts_vector @@ ${queryFn}('english', $1)
        AND ${entityQualityWhereSql('e')}
      ORDER BY rank DESC
      LIMIT $2
    `,
    [searchTerm, limit],
  );
  return result.rows;
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

interface ISearchSentencesResult {
  id: string;
  document_id: string | number;
  page_id: string | number | null;
  sentence_index: number | string;
  sentence_text: string;
  signal_score: number | string | null;
  file_name: string | null;
  document_title: string | null;
  page_number: number | string | null;
  snippet: string | null;
  source_collection: string | null;
  source_release: string | null;
  source_family: string | null;
  asset_id: string | number | null;
  asset_sha256: string | null;
  document_sha256: string | null;
  document_version_hash: string;
  page_text: string | null;
  page_quote_occurrence: number | string | null;
  quote_occurrence: number | string | null;
  ocr_confidence: number | string | null;
  provenance_status: string | null;
  evidence_type: string | null;
  red_flag_rating: number | string | null;
  rank: number | string | null;
}

interface IMaterializedPassageResult {
  citation_id: string;
  citation_schema: string;
  document_id: string | number;
  source_sentence_id: string | number;
  sentence_index: number | string;
  page_id: string | number | null;
  page_number: number | string | null;
  passage_text: string;
  text_sha256: string;
  document_title: string | null;
  file_name: string | null;
  source_collection: string | null;
  source_release: string | null;
  source_family: string;
  asset_id: string | number | null;
  asset_sha256: string | null;
  document_revision_hash: string;
  document_sha256: string | null;
  text_start: number | string | null;
  text_end: number | string | null;
  quote_occurrence: number | string | null;
  scan_bbox: Record<string, unknown> | number[] | null;
  ocr_confidence: number | string | null;
  provenance_status: string | null;
  evidence_type: string | null;
  red_flag_rating: number | string | null;
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

const buildPassageUrl = (
  documentId: string,
  pageNumber: number | null,
  citationId: string,
  searchTerm: string,
  viewMode: 'sidebyside' | 'pdf',
  assetSha256: string | null,
): string => {
  const params = new URLSearchParams({ documentId });
  if (pageNumber !== null) params.set('page', String(pageNumber));
  params.set('passage', citationId);
  params.set('viewMode', viewMode);
  if (assetSha256) params.set('assetSha256', assetSha256);
  params.set('q', searchTerm);
  return `/documents/${encodeURIComponent(documentId)}?${params.toString()}`;
};

const nullablePositiveInteger = (value: number | string | null): number | null => {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
};

const resolveDocumentVersionHash = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^sha256:/, '');
  if (/^[a-f0-9]{64}$/.test(normalized)) return normalized;
  return createHash('sha256').update(value, 'utf8').digest('hex');
};

const normalizeSha256OrNull = (value: string | null): string | null => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^sha256:/, '');
  return /^[a-f0-9]{64}$/.test(normalized) ? normalized : null;
};

const locateTextOccurrence = (
  pageText: string | null,
  quote: string,
  occurrence: number | string | null,
): { textStart: number | null; textEnd: number | null } => {
  if (!pageText || !quote) return { textStart: null, textEnd: null };
  const targetOccurrence = Math.max(0, Number(occurrence) || 0);
  let fromIndex = 0;
  let textStart = -1;
  for (let index = 0; index <= targetOccurrence; index += 1) {
    textStart = pageText.indexOf(quote, fromIndex);
    if (textStart < 0) return { textStart: null, textEnd: null };
    fromIndex = textStart + quote.length;
  }
  return { textStart, textEnd: textStart + quote.length };
};

const mapSentenceRowToPassage = (
  row: ISearchSentencesResult,
  searchTerm: string,
): SearchPassageResultDto => {
  const documentId = String(row.document_id);
  const sentenceId = String(row.id);
  const pageNumber = nullablePositiveInteger(row.page_number);
  const sentenceIndex = Math.max(0, Number(row.sentence_index) || 0);
  const quote = String(row.sentence_text || '');
  const documentVersionHash = resolveDocumentVersionHash(row.document_version_hash);
  const assetSha256 = normalizeSha256OrNull(row.asset_sha256);
  const { textStart, textEnd } = locateTextOccurrence(
    row.page_text,
    quote,
    row.page_quote_occurrence,
  );
  const { citationId, citationSchema, textSha256 } = buildEvidenceCitation({
    documentId,
    documentVersionHash,
    pageNumber,
    sentenceIndex,
    text: quote,
  });

  return {
    citationId,
    citationSchema,
    documentId,
    sentenceId,
    sentenceIndex,
    pageId: row.page_id == null ? null : String(row.page_id),
    pageNumber,
    quote,
    snippet: row.snippet == null ? quote : String(row.snippet),
    documentTitle: String(row.document_title || row.file_name || `Document ${documentId}`),
    fileName: String(row.file_name || row.document_title || `Document ${documentId}`),
    sourceCollection: row.source_collection == null ? null : String(row.source_collection),
    sourceRelease: row.source_release == null ? null : String(row.source_release),
    sourceFamily: String(row.source_family || `document-id:${documentId}`),
    assetId: row.asset_id == null ? null : String(row.asset_id),
    assetSha256,
    documentRevisionHash: documentVersionHash,
    documentSha256: normalizeSha256OrNull(row.document_sha256),
    textSha256,
    textStart,
    textEnd,
    quoteOccurrence: row.quote_occurrence == null ? null : Number(row.quote_occurrence),
    scanBbox: null,
    ocrConfidence: row.ocr_confidence == null ? null : Number(row.ocr_confidence),
    provenanceStatus: row.provenance_status == null ? null : String(row.provenance_status),
    evidenceType: row.evidence_type == null ? null : String(row.evidence_type),
    redFlagRating: row.red_flag_rating == null ? null : Number(row.red_flag_rating),
    textUrl: buildPassageUrl(
      documentId,
      pageNumber,
      citationId,
      searchTerm,
      'sidebyside',
      assetSha256,
    ),
    scanUrl: assetSha256
      ? buildPassageUrl(documentId, pageNumber, citationId, searchTerm, 'pdf', assetSha256)
      : '',
    matchReason: 'passage-text',
  };
};

const mapMaterializedRowToPassage = (
  row: IMaterializedPassageResult,
  searchTerm: string,
): SearchPassageResultDto => {
  const documentId = String(row.document_id);
  const citationId = String(row.citation_id);
  const pageNumber = nullablePositiveInteger(row.page_number);
  const sentenceIndex = Math.max(0, Number(row.sentence_index) || 0);
  const quote = String(row.passage_text || '');
  const assetSha256 = normalizeSha256OrNull(row.asset_sha256);
  const citationIsValid = verifyEvidenceCitation(
    {
      documentId,
      documentVersionHash: String(row.document_revision_hash),
      pageNumber,
      sentenceIndex,
      text: quote,
    },
    {
      citationId,
      citationSchema: String(row.citation_schema),
      textSha256: String(row.text_sha256),
    },
  );
  if (!citationIsValid) {
    throw new Error(`Evidence passage ${citationId} failed canonical citation verification`);
  }

  return {
    citationId,
    citationSchema: String(row.citation_schema),
    documentId,
    sentenceId: String(row.source_sentence_id),
    sentenceIndex,
    pageId: row.page_id == null ? null : String(row.page_id),
    pageNumber,
    quote,
    snippet: quote,
    documentTitle: String(row.document_title || row.file_name || `Document ${documentId}`),
    fileName: String(row.file_name || row.document_title || `Document ${documentId}`),
    sourceCollection: row.source_collection == null ? null : String(row.source_collection),
    sourceRelease: row.source_release == null ? null : String(row.source_release),
    sourceFamily: String(row.source_family || `document-id:${documentId}`),
    assetId: row.asset_id == null ? null : String(row.asset_id),
    assetSha256,
    documentRevisionHash: String(row.document_revision_hash),
    documentSha256: row.document_sha256 == null ? null : String(row.document_sha256),
    textSha256: String(row.text_sha256),
    textStart: row.text_start == null ? null : Number(row.text_start),
    textEnd: row.text_end == null ? null : Number(row.text_end),
    quoteOccurrence: row.quote_occurrence == null ? null : Number(row.quote_occurrence),
    scanBbox: row.scan_bbox,
    ocrConfidence: row.ocr_confidence == null ? null : Number(row.ocr_confidence),
    provenanceStatus: row.provenance_status == null ? null : String(row.provenance_status),
    evidenceType: row.evidence_type == null ? null : String(row.evidence_type),
    redFlagRating: row.red_flag_rating == null ? null : Number(row.red_flag_rating),
    textUrl: buildPassageUrl(
      documentId,
      pageNumber,
      citationId,
      searchTerm,
      'sidebyside',
      assetSha256,
    ),
    scanUrl: assetSha256
      ? buildPassageUrl(documentId, pageNumber, citationId, searchTerm, 'pdf', assetSha256)
      : '',
    matchReason: 'citation-id',
  };
};

async function materializePassageRows(
  rows: ISearchSentencesResult[],
  passages: SearchPassageResultDto[],
): Promise<void> {
  if (rows.length === 0) return;

  const values: unknown[] = [];
  const tuples = rows.map((row, rowIndex) => {
    const passage = passages[rowIndex];
    const offset = rowIndex * 22;
    values.push(
      passage.citationId,
      passage.citationSchema,
      passage.documentId,
      passage.documentRevisionHash,
      passage.documentSha256,
      passage.assetId,
      passage.assetSha256,
      passage.pageId,
      passage.pageNumber,
      passage.sentenceId,
      Math.max(0, Number(row.sentence_index) || 0),
      passage.quote,
      passage.textSha256,
      passage.textStart,
      passage.textEnd,
      passage.quoteOccurrence,
      passage.scanBbox,
      passage.ocrConfidence,
      passage.sourceCollection,
      passage.sourceRelease,
      passage.sourceFamily,
      passage.provenanceStatus || 'missing',
    );
    return `(${Array.from({ length: 22 }, (_, index) => `$${offset + index + 1}`).join(', ')})`;
  });

  await getApiPool().query(
    `
      INSERT INTO evidence_passages (
        citation_id,
        citation_schema,
        document_id,
        document_revision_hash,
        document_sha256,
        asset_id,
        asset_sha256,
        page_id,
        page_number,
        source_sentence_id,
        sentence_index,
        passage_text,
        text_sha256,
        text_start,
        text_end,
        quote_occurrence,
        scan_bbox,
        ocr_confidence,
        source_collection,
        source_release,
        source_family,
        provenance_status
      ) VALUES ${tuples.join(', ')}
      ON CONFLICT (citation_id) DO NOTHING
    `,
    values,
  );
}

async function searchInvestigationRows(searchTerm: string, limit: number) {
  return getApiPool().query<ISearchInvestigationsResult>(
    `
      SELECT
        id::text,
        uuid::text,
        title,
        description,
        status,
        ts_headline(
          'english',
          title || ' ' || coalesce(description, ''),
          websearch_to_tsquery('english', $1),
          'MaxWords=25,MinWords=8'
        ) AS snippet,
        ts_rank_cd(fts_vector, websearch_to_tsquery('english', $1), 32) AS rank
      FROM investigations
      WHERE fts_vector @@ websearch_to_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT $2
    `,
    [searchTerm, limit],
  );
}

async function searchArticleRows(searchTerm: string, limit: number) {
  return getApiPool().query<ISearchArticlesResult>(
    `
      SELECT
        id::text,
        title,
        source,
        author,
        pub_date AS "pubDate",
        ts_headline(
          'english',
          title || ' ' || coalesce(description, '') || ' ' || coalesce(content, ''),
          websearch_to_tsquery('english', $1),
          'MaxWords=25,MinWords=8'
        ) AS snippet,
        ts_rank_cd(fts_vector, websearch_to_tsquery('english', $1), 32) AS rank
      FROM articles
      WHERE fts_vector @@ websearch_to_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT $2
    `,
    [searchTerm, limit],
  );
}

async function searchMediaRows(searchTerm: string, limit: number) {
  return getApiPool().query<ISearchMediaResult>(
    `
      SELECT
        id::text,
        file_path AS "filename",
        title,
        description,
        file_path AS "filePath",
        file_type AS "fileType",
        ts_headline(
          'english',
          file_path || ' ' || coalesce(title, '') || ' ' || coalesce(description, ''),
          websearch_to_tsquery('english', $1),
          'MaxWords=25,MinWords=8'
        ) AS snippet,
        ts_rank_cd(fts_vector, websearch_to_tsquery('english', $1), 32) AS rank
      FROM media_items m
      WHERE m.fts_vector @@ websearch_to_tsquery('english', $1)
        AND ${normalMediaEvidenceWhereSql('m')}
      ORDER BY rank DESC
      LIMIT $2
    `,
    [searchTerm, limit],
  );
}

async function searchSentenceRows(
  searchTerm: string,
  limit: number,
  isPrefix = false,
  filters: SearchFilters = {},
) {
  const queryFn = isPrefix ? 'to_tsquery' : 'websearch_to_tsquery';
  return getApiPool().query<ISearchSentencesResult>(
    `
      WITH sentence_matches AS MATERIALIZED (
        SELECT
          s.id,
          s.document_id,
          s.page_id,
          s.sentence_index,
          s.sentence_text,
          s.signal_score,
          ts_headline(
            'english',
            s.sentence_text,
            ${queryFn}('english', $1),
            'MaxWords=24,MinWords=8'
          ) AS snippet,
          ts_rank_cd(s.fts_vector, ${queryFn}('english', $1), 32) AS rank
        FROM document_sentences s
        JOIN documents source_doc ON source_doc.id = s.document_id
        WHERE s.fts_vector @@ ${queryFn}('english', $1)
          AND (
            $3::text IS NULL
            OR LOWER(COALESCE(source_doc.evidence_type, '')) = LOWER($3)
          )
          AND ($4::numeric IS NULL OR COALESCE(source_doc.red_flag_rating, 0) >= $4)
          AND ($5::numeric IS NULL OR COALESCE(source_doc.red_flag_rating, 0) <= $5)
        ORDER BY rank DESC, s.id ASC
        LIMIT $2
      )
      SELECT
        sm.id::text,
        sm.document_id,
        sm.page_id,
        sm.sentence_index,
        sm.sentence_text,
        sm.signal_score,
        d.file_name,
        COALESCE(NULLIF(d.title, ''), NULLIF(d.file_name, ''), 'Document ' || d.id::text)
          AS document_title,
        p.page_number,
        sm.snippet,
        COALESCE(d.source_collection, asset.source_collection) AS source_collection,
        d.source_release,
        COALESCE(
          CASE
            WHEN LOWER(REGEXP_REPLACE(COALESCE(asset.sha256, ''), '^sha256:', ''))
              ~ '^[a-f0-9]{64}$'
              THEN 'asset-sha256:'
                || LOWER(REGEXP_REPLACE(asset.sha256, '^sha256:', ''))
          END,
          CASE
            WHEN LOWER(REGEXP_REPLACE(COALESCE(d.content_sha256, ''), '^sha256:', ''))
              ~ '^[a-f0-9]{64}$'
              THEN 'document-sha256:'
                || LOWER(REGEXP_REPLACE(d.content_sha256, '^sha256:', ''))
          END,
          'document-id:' || COALESCE(d.original_file_id, d.id)::text
        ) AS source_family,
        asset.id AS asset_id,
        asset.sha256 AS asset_sha256,
        NULLIF(d.content_sha256, '') AS document_sha256,
        COALESCE(
          NULLIF(d.normalized_text_sha256, ''),
          NULLIF(d.content_sha256, ''),
          NULLIF(asset.sha256, ''),
          NULLIF(d.content_hash, ''),
          'document-id:' || d.id::text
        ) AS document_version_hash,
        p.extracted_text AS page_text,
        occurrence.page_quote_occurrence,
        occurrence.quote_occurrence,
        p.ocr_confidence_avg AS ocr_confidence,
        d.provenance_status,
        d.evidence_type,
        d.red_flag_rating,
        sm.rank
      FROM sentence_matches sm
      JOIN documents d ON d.id = sm.document_id
      LEFT JOIN document_pages p ON p.id = sm.page_id
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(original.id, fa.id) AS id,
          COALESCE(original.sha256, fa.sha256) AS sha256,
          COALESCE(original.source_collection, fa.source_collection) AS source_collection
        FROM document_assets da
        JOIN file_assets fa ON fa.id = da.asset_id
        LEFT JOIN file_assets original ON original.id = fa.original_asset_id
        WHERE da.document_id = sm.document_id
        ORDER BY
          CASE da.role WHEN 'original' THEN 0 WHEN 'primary' THEN 1 ELSE 2 END,
          fa.is_original DESC,
          fa.id ASC
        LIMIT 1
      ) asset ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) FILTER (WHERE prior.page_id = sm.page_id)::INTEGER
            AS page_quote_occurrence,
          COUNT(*)::INTEGER AS quote_occurrence
        FROM document_sentences prior
        WHERE prior.document_id = sm.document_id
          AND prior.sentence_text = sm.sentence_text
          AND (
            prior.sentence_index < sm.sentence_index
            OR (prior.sentence_index = sm.sentence_index AND prior.id < sm.id)
          )
      ) occurrence ON TRUE
      ORDER BY sm.rank DESC, sm.id ASC
    `,
    [
      searchTerm,
      limit,
      filters.evidenceType && filters.evidenceType !== 'ALL' ? filters.evidenceType : null,
      filters.redFlagMin ?? null,
      filters.redFlagMax ?? null,
    ],
  );
}

async function getMaterializedPassageRow(citationId: string) {
  return getApiPool().query<IMaterializedPassageResult>(
    `
      SELECT
        ep.citation_id,
        ep.citation_schema,
        ep.document_id,
        ep.source_sentence_id,
        ep.sentence_index,
        ep.page_id,
        ep.page_number,
        ep.passage_text,
        ep.text_sha256,
        ep.text_start,
        ep.text_end,
        ep.quote_occurrence,
        ep.scan_bbox,
        COALESCE(NULLIF(d.title, ''), NULLIF(d.file_name, ''), 'Document ' || d.id::text)
          AS document_title,
        d.file_name,
        COALESCE(ep.source_collection, d.source_collection, pinned_asset.source_collection)
          AS source_collection,
        COALESCE(ep.source_release, d.source_release) AS source_release,
        ep.source_family,
        ep.asset_id,
        ep.asset_sha256,
        ep.document_revision_hash,
        ep.document_sha256,
        ep.ocr_confidence,
        COALESCE(ep.provenance_status, d.provenance_status) AS provenance_status,
        d.evidence_type,
        d.red_flag_rating
      FROM evidence_passages ep
      JOIN documents d ON d.id = ep.document_id
      LEFT JOIN file_assets pinned_asset ON pinned_asset.id = ep.asset_id
      WHERE ep.citation_id = $1
      LIMIT 1
    `,
    [citationId],
  );
}

export interface UnifiedSearchResult {
  entities: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  passages?: SearchPassageResultDto[];
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
  redFlagMin?: number;
  redFlagMax?: number;
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
        passages: [],
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
        passages: [],
        investigations: [],
        articles: [],
        media: [],
        didYouMean: [],
      };
    }

    // ── Entities ─────────────────────────────────────────────────────────────
    let mergedEntityRows: EntitySearchRow[] = [];
    const entityMatchReasons = new Map<string, string>();
    const shouldSearchEntities = !isJunkEntityName(searchTerm);

    if (!shouldSearchEntities) {
      logger.info({ searchTerm }, '[searchRepository] skipping entity search for junk-like query');
    } else if (effectiveMode === 'semantic') {
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
                e.id,
                e.full_name AS "fullName",
                e.primary_role AS "primaryRole",
                e.aliases,
                e.red_flag_rating AS "redFlagRating"
              FROM entities e
              WHERE e.id = ANY($1::bigint[])
                AND ${entityQualityWhereSql('e')}
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
      const entityRows = await searchEntityLexicalRows(tsArg, safeLimit, isPrefix);
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
                  e.id,
                  e.full_name AS "fullName",
                  e.primary_role AS "primaryRole",
                  e.aliases,
                  e.red_flag_rating AS "redFlagRating"
                FROM entities e
                WHERE e.id = ANY($1::bigint[])
                  AND ${entityQualityWhereSql('e')}
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

    mergedEntityRows = mergedEntityRows.filter((row) => !isJunkEntityName(row.fullName));

    if (
      shouldSearchEntities &&
      canUseEntityFuzzyFallback(searchTerm) &&
      !isPrefix &&
      mergedEntityRows.length < safeLimit &&
      effectiveMode !== 'semantic'
    ) {
      try {
        const fallbackRows = await loadEntityFallbackRows(
          searchTerm,
          Math.max(safeLimit * 2, safeLimit - mergedEntityRows.length),
        );
        const seenIds = new Set(mergedEntityRows.map((row) => String(row.id)));
        for (const row of fallbackRows.rows) {
          const entityId = String(row.id);
          if (seenIds.has(entityId)) continue;
          if (isJunkEntityName(row.fullName)) continue;
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
    let minRedFlag: number | null = filters.redFlagMin ?? null;
    let maxRedFlag: number | null = filters.redFlagMax ?? null;

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

    const passageLimit = Math.min(50, safeLimit);
    const passageRowsPromise = searchSentenceRows(tsArg, passageLimit, isPrefix, filters).catch(
      (error) => {
        logger.warn({ err: error }, '[searchRepository] passage search failed');
        return null;
      },
    );

    // These independent result types can load in parallel.
    const [passageResult, investigationResult, articleResult, mediaResult] = await Promise.all([
      passageRowsPromise,
      searchInvestigationRows(tsArg, safeLimit),
      searchArticleRows(tsArg, safeLimit),
      searchMediaRows(tsArg, safeLimit),
    ]);
    const passageRows = passageResult?.rows ?? [];
    const investigationRows = investigationResult.rows;
    const articleRows = articleResult.rows;
    const mediaRows = mediaResult.rows;

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
      .filter((entity) => !isJunkEntityName(entity.fullName))
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

    let passages = passageRows.map((row) => mapSentenceRowToPassage(row, searchTerm));
    if (passages.length > 0) {
      try {
        await materializePassageRows(passageRows, passages);
      } catch (error) {
        logger.warn(
          { err: error },
          '[searchRepository] passage materialization failed; suppressing unstable passage links',
        );
        passages = [];
      }
    }

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
      passages,
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
      return (await searchSentenceRows(searchTerm, safeLimit)).rows;
    } catch (error) {
      logger.error({ err: error }, '[searchRepository] searchSentences error');
      return [];
    }
  },

  getPassageByCitationId: async (
    citationId: string,
    searchTerm: string = '',
  ): Promise<SearchPassageResultDto | null> => {
    if (!/^EA-P-[a-f0-9]{40}$/.test(citationId)) return null;
    const result = await getMaterializedPassageRow(citationId);
    const row = result.rows[0];
    return row ? mapMaterializedRowToPassage(row, searchTerm.trim()) : null;
  },

  getDatabaseStats: async () => {
    const pool = getApiPool();
    const [docCount, entityCount] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM documents'),
      pool.query('SELECT COUNT(*) as total FROM entities'),
    ]);
    return {
      totalDocuments: Number(docCount.rows[0]?.total ?? 0),
      totalEntities: Number(entityCount.rows[0]?.total ?? 0),
    };
  },
};
