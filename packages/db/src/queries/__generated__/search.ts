/** Types generated for queries found in "src/queries/search.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

/** 'SearchEntities' parameters type */
export interface ISearchEntitiesParams {
  limit: NumberOrString;
  searchTerm: string;
}

/** 'SearchEntities' return type */
export interface ISearchEntitiesResult {
  aliases: string | null;
  fullName: string;
  id: string;
  primaryRole: string | null;
  rank: number | null;
  redFlagRating: number | null;
}

/** 'SearchEntities' query type */
export interface ISearchEntitiesQuery {
  params: ISearchEntitiesParams;
  result: ISearchEntitiesResult;
}

const searchEntitiesIR: any = {
  usedParamSet: { searchTerm: true, limit: true },
  params: [
    {
      name: 'searchTerm',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 209, b: 220 },
        { a: 306, b: 317 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 1713, b: 1719 }] },
  ],
  statement:
    "SELECT\n  e.id,\n  e.full_name          AS \"fullName\",\n  e.primary_role       AS \"primaryRole\",\n  e.aliases,\n  e.red_flag_rating    AS \"redFlagRating\",\n  ts_rank_cd(e.fts_vector, websearch_to_tsquery('english', :searchTerm!), 32) AS rank\nFROM entities e\nWHERE e.fts_vector @@ websearch_to_tsquery('english', :searchTerm!)\n  AND COALESCE(e.junk_tier, 'clean') = 'clean'\n  AND COALESCE(e.quarantine_status, 0) = 0\n  AND e.full_name IS NOT NULL\n  AND BTRIM(e.full_name) != ''\n  AND LOWER(e.full_name) !~* '^(to|from|cc|bcc|subject|re|fwd|fw|sent|received)\\M[:\\s-]*'\n  AND LOWER(e.full_name) !~* '^(on|at|in|with)\\s+(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\\M'\n  AND LOWER(e.full_name) !~* '\\m(mon|tue|wed|thu|fri|sat|sun)\\M\\s*$'\n  AND LOWER(e.full_name) !~* '\\m([[:alpha:]]{3,})\\s+\\1\\M'\n  AND LOWER(e.full_name) !~* '\\m(department|office|policy|inc|llc|corp|corporation|ltd|associates|foundation|trust|university|school|academy|committee|ministry|agency|bureau|division|building|street|road|avenue|contact|privacy|terms)\\M'\n  AND LOWER(e.full_name) !~* '\\m(bluray|blu-ray|disc|rewritable|dumpster|hauls|columns|demolition|ditchin|postage|acoustics|personnel|persoanel)\\M'\n  AND LOWER(e.full_name) !~* '^(east|west|north|south)\\s+(if|aft|aftstreet|street|road|avenue)\\M'\n  AND LOWER(e.full_name) !~* '\\m(direction|provided)\\M\\s*$'\n  AND LOWER(e.full_name) !~* '\\m(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\\M\\s*$'\n  AND LOWER(e.full_name) !~* '\\m[[:alpha:]]+''?s\\s+(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\\M'\n  AND LOWER(e.full_name) !~* '^(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\\M'\nORDER BY rank DESC\nLIMIT :limit!",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   e.id,
 *   e.full_name          AS "fullName",
 *   e.primary_role       AS "primaryRole",
 *   e.aliases,
 *   e.red_flag_rating    AS "redFlagRating",
 *   ts_rank_cd(e.fts_vector, websearch_to_tsquery('english', :searchTerm!), 32) AS rank
 * FROM entities e
 * WHERE e.fts_vector @@ websearch_to_tsquery('english', :searchTerm!)
 *   AND COALESCE(e.junk_tier, 'clean') = 'clean'
 *   AND COALESCE(e.quarantine_status, 0) = 0
 *   AND e.full_name IS NOT NULL
 *   AND BTRIM(e.full_name) != ''
 *   AND LOWER(e.full_name) !~* '^(to|from|cc|bcc|subject|re|fwd|fw|sent|received)\M[:\s-]*'
 *   AND LOWER(e.full_name) !~* '^(on|at|in|with)\s+(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\M'
 *   AND LOWER(e.full_name) !~* '\m(mon|tue|wed|thu|fri|sat|sun)\M\s*$'
 *   AND LOWER(e.full_name) !~* '\m([[:alpha:]]{3,})\s+\1\M'
 *   AND LOWER(e.full_name) !~* '\m(department|office|policy|inc|llc|corp|corporation|ltd|associates|foundation|trust|university|school|academy|committee|ministry|agency|bureau|division|building|street|road|avenue|contact|privacy|terms)\M'
 *   AND LOWER(e.full_name) !~* '\m(bluray|blu-ray|disc|rewritable|dumpster|hauls|columns|demolition|ditchin|postage|acoustics|personnel|persoanel)\M'
 *   AND LOWER(e.full_name) !~* '^(east|west|north|south)\s+(if|aft|aftstreet|street|road|avenue)\M'
 *   AND LOWER(e.full_name) !~* '\m(direction|provided)\M\s*$'
 *   AND LOWER(e.full_name) !~* '\m(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M\s*$'
 *   AND LOWER(e.full_name) !~* '\m[[:alpha:]]+''?s\s+(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M'
 *   AND LOWER(e.full_name) !~* '^(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M'
 * ORDER BY rank DESC
 * LIMIT :limit!
 * ```
 */
export const searchEntities = new PreparedQuery<ISearchEntitiesParams, ISearchEntitiesResult>(
  searchEntitiesIR,
);

/** 'SearchEntitiesPrefix' parameters type */
export interface ISearchEntitiesPrefixParams {
  limit: NumberOrString;
  searchTerm: string;
}

/** 'SearchEntitiesPrefix' return type */
export interface ISearchEntitiesPrefixResult {
  aliases: string | null;
  fullName: string;
  id: string;
  primaryRole: string | null;
  rank: number | null;
  redFlagRating: number | null;
}

/** 'SearchEntitiesPrefix' query type */
export interface ISearchEntitiesPrefixQuery {
  params: ISearchEntitiesPrefixParams;
  result: ISearchEntitiesPrefixResult;
}

const searchEntitiesPrefixIR: any = {
  usedParamSet: { searchTerm: true, limit: true },
  params: [
    {
      name: 'searchTerm',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 199, b: 210 },
        { a: 286, b: 297 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 1693, b: 1699 }] },
  ],
  statement:
    "SELECT\n  e.id,\n  e.full_name          AS \"fullName\",\n  e.primary_role       AS \"primaryRole\",\n  e.aliases,\n  e.red_flag_rating    AS \"redFlagRating\",\n  ts_rank_cd(e.fts_vector, to_tsquery('english', :searchTerm!), 32) AS rank\nFROM entities e\nWHERE e.fts_vector @@ to_tsquery('english', :searchTerm!)\n  AND COALESCE(e.junk_tier, 'clean') = 'clean'\n  AND COALESCE(e.quarantine_status, 0) = 0\n  AND e.full_name IS NOT NULL\n  AND BTRIM(e.full_name) != ''\n  AND LOWER(e.full_name) !~* '^(to|from|cc|bcc|subject|re|fwd|fw|sent|received)\\M[:\\s-]*'\n  AND LOWER(e.full_name) !~* '^(on|at|in|with)\\s+(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\\M'\n  AND LOWER(e.full_name) !~* '\\m(mon|tue|wed|thu|fri|sat|sun)\\M\\s*$'\n  AND LOWER(e.full_name) !~* '\\m([[:alpha:]]{3,})\\s+\\1\\M'\n  AND LOWER(e.full_name) !~* '\\m(department|office|policy|inc|llc|corp|corporation|ltd|associates|foundation|trust|university|school|academy|committee|ministry|agency|bureau|division|building|street|road|avenue|contact|privacy|terms)\\M'\n  AND LOWER(e.full_name) !~* '\\m(bluray|blu-ray|disc|rewritable|dumpster|hauls|columns|demolition|ditchin|postage|acoustics|personnel|persoanel)\\M'\n  AND LOWER(e.full_name) !~* '^(east|west|north|south)\\s+(if|aft|aftstreet|street|road|avenue)\\M'\n  AND LOWER(e.full_name) !~* '\\m(direction|provided)\\M\\s*$'\n  AND LOWER(e.full_name) !~* '\\m(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\\M\\s*$'\n  AND LOWER(e.full_name) !~* '\\m[[:alpha:]]+''?s\\s+(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\\M'\n  AND LOWER(e.full_name) !~* '^(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\\M'\nORDER BY rank DESC\nLIMIT :limit!",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   e.id,
 *   e.full_name          AS "fullName",
 *   e.primary_role       AS "primaryRole",
 *   e.aliases,
 *   e.red_flag_rating    AS "redFlagRating",
 *   ts_rank_cd(e.fts_vector, to_tsquery('english', :searchTerm!), 32) AS rank
 * FROM entities e
 * WHERE e.fts_vector @@ to_tsquery('english', :searchTerm!)
 *   AND COALESCE(e.junk_tier, 'clean') = 'clean'
 *   AND COALESCE(e.quarantine_status, 0) = 0
 *   AND e.full_name IS NOT NULL
 *   AND BTRIM(e.full_name) != ''
 *   AND LOWER(e.full_name) !~* '^(to|from|cc|bcc|subject|re|fwd|fw|sent|received)\M[:\s-]*'
 *   AND LOWER(e.full_name) !~* '^(on|at|in|with)\s+(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\M'
 *   AND LOWER(e.full_name) !~* '\m(mon|tue|wed|thu|fri|sat|sun)\M\s*$'
 *   AND LOWER(e.full_name) !~* '\m([[:alpha:]]{3,})\s+\1\M'
 *   AND LOWER(e.full_name) !~* '\m(department|office|policy|inc|llc|corp|corporation|ltd|associates|foundation|trust|university|school|academy|committee|ministry|agency|bureau|division|building|street|road|avenue|contact|privacy|terms)\M'
 *   AND LOWER(e.full_name) !~* '\m(bluray|blu-ray|disc|rewritable|dumpster|hauls|columns|demolition|ditchin|postage|acoustics|personnel|persoanel)\M'
 *   AND LOWER(e.full_name) !~* '^(east|west|north|south)\s+(if|aft|aftstreet|street|road|avenue)\M'
 *   AND LOWER(e.full_name) !~* '\m(direction|provided)\M\s*$'
 *   AND LOWER(e.full_name) !~* '\m(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M\s*$'
 *   AND LOWER(e.full_name) !~* '\m[[:alpha:]]+''?s\s+(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M'
 *   AND LOWER(e.full_name) !~* '^(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M'
 * ORDER BY rank DESC
 * LIMIT :limit!
 * ```
 */
export const searchEntitiesPrefix = new PreparedQuery<
  ISearchEntitiesPrefixParams,
  ISearchEntitiesPrefixResult
>(searchEntitiesPrefixIR);

/** 'SearchDocuments' parameters type */
export interface ISearchDocumentsParams {
  evidenceType?: string | null | void;
  limit: NumberOrString;
  maxRedFlag?: number | null | void;
  minRedFlag?: number | null | void;
  searchTerm: string;
}

/** 'SearchDocuments' return type */
export interface ISearchDocumentsResult {
  evidenceType: string | null;
  fileName: string | null;
  filePath: string | null;
  id: string;
  rank: number | null;
  redFlagRating: number | null;
  snippet: string | null;
}

/** 'SearchDocuments' query type */
export interface ISearchDocumentsQuery {
  params: ISearchDocumentsParams;
  result: ISearchDocumentsResult;
}

const searchDocumentsIR: any = {
  usedParamSet: {
    searchTerm: true,
    evidenceType: true,
    minRedFlag: true,
    maxRedFlag: true,
    limit: true,
  },
  params: [
    {
      name: 'searchTerm',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 312, b: 323 },
        { a: 414, b: 425 },
        { a: 913, b: 924 },
      ],
    },
    {
      name: 'evidenceType',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 437, b: 449 },
        { a: 486, b: 498 },
      ],
    },
    {
      name: 'minRedFlag',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 516, b: 526 },
        { a: 565, b: 575 },
      ],
    },
    {
      name: 'maxRedFlag',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 592, b: 602 },
        { a: 641, b: 651 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 688, b: 694 }] },
  ],
  statement:
    'WITH matched_docs AS (\n  SELECT\n    d.id,\n    d.file_name           AS "fileName",\n    d.file_path           AS "filePath",\n    d.evidence_type       AS "evidenceType",\n    d.red_flag_rating     AS "redFlagRating",\n    d.title,\n    d.content_refined,\n    ts_rank_cd(d.fts_vector, websearch_to_tsquery(\'english\', :searchTerm!), 32) AS rank\n  FROM documents d\n  WHERE d.fts_vector @@ websearch_to_tsquery(\'english\', :searchTerm!)\n    AND (:evidenceType::text IS NULL OR d.evidence_type = :evidenceType::text)\n    AND (:minRedFlag::int IS NULL OR d.red_flag_rating >= :minRedFlag::int)\n    AND (:maxRedFlag::int IS NULL OR d.red_flag_rating <= :maxRedFlag::int)\n  ORDER BY rank DESC\n  LIMIT :limit!\n)\nSELECT\n  id,\n  "fileName",\n  "filePath",\n  "evidenceType",\n  "redFlagRating",\n  ts_headline(\'english\',\n    coalesce(title, \'\') || \' \' || left(coalesce(content_refined, \'\'), 500),\n    websearch_to_tsquery(\'english\', :searchTerm!),\n    \'MaxWords=25,MinWords=8,ShortWord=3,HighlightAll=FALSE,MaxFragments=2\'\n  ) AS snippet,\n  rank\nFROM matched_docs\nORDER BY rank DESC',
};

/**
 * Query generated from SQL:
 * ```
 * WITH matched_docs AS (
 *   SELECT
 *     d.id,
 *     d.file_name           AS "fileName",
 *     d.file_path           AS "filePath",
 *     d.evidence_type       AS "evidenceType",
 *     d.red_flag_rating     AS "redFlagRating",
 *     d.title,
 *     d.content_refined,
 *     ts_rank_cd(d.fts_vector, websearch_to_tsquery('english', :searchTerm!), 32) AS rank
 *   FROM documents d
 *   WHERE d.fts_vector @@ websearch_to_tsquery('english', :searchTerm!)
 *     AND (:evidenceType::text IS NULL OR d.evidence_type = :evidenceType::text)
 *     AND (:minRedFlag::int IS NULL OR d.red_flag_rating >= :minRedFlag::int)
 *     AND (:maxRedFlag::int IS NULL OR d.red_flag_rating <= :maxRedFlag::int)
 *   ORDER BY rank DESC
 *   LIMIT :limit!
 * )
 * SELECT
 *   id,
 *   "fileName",
 *   "filePath",
 *   "evidenceType",
 *   "redFlagRating",
 *   ts_headline('english',
 *     coalesce(title, '') || ' ' || left(coalesce(content_refined, ''), 500),
 *     websearch_to_tsquery('english', :searchTerm!),
 *     'MaxWords=25,MinWords=8,ShortWord=3,HighlightAll=FALSE,MaxFragments=2'
 *   ) AS snippet,
 *   rank
 * FROM matched_docs
 * ORDER BY rank DESC
 * ```
 */
export const searchDocuments = new PreparedQuery<ISearchDocumentsParams, ISearchDocumentsResult>(
  searchDocumentsIR,
);

/** 'SearchDocumentsPrefix' parameters type */
export interface ISearchDocumentsPrefixParams {
  evidenceType?: string | null | void;
  limit: NumberOrString;
  maxRedFlag?: number | null | void;
  minRedFlag?: number | null | void;
  searchTerm: string;
}

/** 'SearchDocumentsPrefix' return type */
export interface ISearchDocumentsPrefixResult {
  evidenceType: string | null;
  fileName: string | null;
  filePath: string | null;
  id: string;
  rank: number | null;
  redFlagRating: number | null;
  snippet: string | null;
}

/** 'SearchDocumentsPrefix' query type */
export interface ISearchDocumentsPrefixQuery {
  params: ISearchDocumentsPrefixParams;
  result: ISearchDocumentsPrefixResult;
}

const searchDocumentsPrefixIR: any = {
  usedParamSet: {
    searchTerm: true,
    evidenceType: true,
    minRedFlag: true,
    maxRedFlag: true,
    limit: true,
  },
  params: [
    {
      name: 'searchTerm',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 302, b: 313 },
        { a: 394, b: 405 },
        { a: 883, b: 894 },
      ],
    },
    {
      name: 'evidenceType',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 417, b: 429 },
        { a: 466, b: 478 },
      ],
    },
    {
      name: 'minRedFlag',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 496, b: 506 },
        { a: 545, b: 555 },
      ],
    },
    {
      name: 'maxRedFlag',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 572, b: 582 },
        { a: 621, b: 631 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 668, b: 674 }] },
  ],
  statement:
    'WITH matched_docs AS (\n  SELECT\n    d.id,\n    d.file_name           AS "fileName",\n    d.file_path           AS "filePath",\n    d.evidence_type       AS "evidenceType",\n    d.red_flag_rating     AS "redFlagRating",\n    d.title,\n    d.content_refined,\n    ts_rank_cd(d.fts_vector, to_tsquery(\'english\', :searchTerm!), 32) AS rank\n  FROM documents d\n  WHERE d.fts_vector @@ to_tsquery(\'english\', :searchTerm!)\n    AND (:evidenceType::text IS NULL OR d.evidence_type = :evidenceType::text)\n    AND (:minRedFlag::int IS NULL OR d.red_flag_rating >= :minRedFlag::int)\n    AND (:maxRedFlag::int IS NULL OR d.red_flag_rating <= :maxRedFlag::int)\n  ORDER BY rank DESC\n  LIMIT :limit!\n)\nSELECT\n  id,\n  "fileName",\n  "filePath",\n  "evidenceType",\n  "redFlagRating",\n  ts_headline(\'english\',\n    coalesce(title, \'\') || \' \' || left(coalesce(content_refined, \'\'), 500),\n    to_tsquery(\'english\', :searchTerm!),\n    \'MaxWords=25,MinWords=8,ShortWord=3,HighlightAll=FALSE,MaxFragments=2\'\n  ) AS snippet,\n  rank\nFROM matched_docs\nORDER BY rank DESC',
};

/**
 * Query generated from SQL:
 * ```
 * WITH matched_docs AS (
 *   SELECT
 *     d.id,
 *     d.file_name           AS "fileName",
 *     d.file_path           AS "filePath",
 *     d.evidence_type       AS "evidenceType",
 *     d.red_flag_rating     AS "redFlagRating",
 *     d.title,
 *     d.content_refined,
 *     ts_rank_cd(d.fts_vector, to_tsquery('english', :searchTerm!), 32) AS rank
 *   FROM documents d
 *   WHERE d.fts_vector @@ to_tsquery('english', :searchTerm!)
 *     AND (:evidenceType::text IS NULL OR d.evidence_type = :evidenceType::text)
 *     AND (:minRedFlag::int IS NULL OR d.red_flag_rating >= :minRedFlag::int)
 *     AND (:maxRedFlag::int IS NULL OR d.red_flag_rating <= :maxRedFlag::int)
 *   ORDER BY rank DESC
 *   LIMIT :limit!
 * )
 * SELECT
 *   id,
 *   "fileName",
 *   "filePath",
 *   "evidenceType",
 *   "redFlagRating",
 *   ts_headline('english',
 *     coalesce(title, '') || ' ' || left(coalesce(content_refined, ''), 500),
 *     to_tsquery('english', :searchTerm!),
 *     'MaxWords=25,MinWords=8,ShortWord=3,HighlightAll=FALSE,MaxFragments=2'
 *   ) AS snippet,
 *   rank
 * FROM matched_docs
 * ORDER BY rank DESC
 * ```
 */
export const searchDocumentsPrefix = new PreparedQuery<
  ISearchDocumentsPrefixParams,
  ISearchDocumentsPrefixResult
>(searchDocumentsPrefixIR);

/** Query 'SearchSentences' is invalid, so its result is assigned type 'never'.
 *  */
export type ISearchSentencesResult = never;

/** Query 'SearchSentences' is invalid, so its parameters are assigned type 'never'.
 *  */
export type ISearchSentencesParams = never;

const searchSentencesIR: any = {
  usedParamSet: { searchTerm: true, limit: true },
  params: [
    {
      name: 'searchTerm',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 216, b: 227 },
        { a: 440, b: 451 },
        { a: 520, b: 531 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 550, b: 556 }] },
  ],
  statement:
    "SELECT\n  s.id,\n  s.document_id,\n  s.page_id,\n  s.sentence_text,\n  s.signal_score,\n  d.file_name,\n  COALESCE(p.page_number, 1) AS page_number,\n  ts_headline('english', s.sentence_text, websearch_to_tsquery('english', :searchTerm!),\n    'MaxWords=15,MinWords=5') AS snippet\nFROM document_sentences s\nJOIN documents d ON d.id = s.document_id\nLEFT JOIN document_pages p ON p.id = s.page_id\nWHERE s.fts_vector @@ websearch_to_tsquery('english', :searchTerm!)\nORDER BY ts_rank_cd(s.fts_vector, websearch_to_tsquery('english', :searchTerm!), 32) DESC\nLIMIT :limit!",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   s.id,
 *   s.document_id,
 *   s.page_id,
 *   s.sentence_text,
 *   s.signal_score,
 *   d.file_name,
 *   COALESCE(p.page_number, 1) AS page_number,
 *   ts_headline('english', s.sentence_text, websearch_to_tsquery('english', :searchTerm!),
 *     'MaxWords=15,MinWords=5') AS snippet
 * FROM document_sentences s
 * JOIN documents d ON d.id = s.document_id
 * LEFT JOIN document_pages p ON p.id = s.page_id
 * WHERE s.fts_vector @@ websearch_to_tsquery('english', :searchTerm!)
 * ORDER BY ts_rank_cd(s.fts_vector, websearch_to_tsquery('english', :searchTerm!), 32) DESC
 * LIMIT :limit!
 * ```
 */
export const searchSentences = new PreparedQuery<ISearchSentencesParams, ISearchSentencesResult>(
  searchSentencesIR,
);

/** Query 'SearchInvestigations' is invalid, so its result is assigned type 'never'.
 *  */
export type ISearchInvestigationsResult = never;

/** Query 'SearchInvestigations' is invalid, so its parameters are assigned type 'never'.
 *  */
export type ISearchInvestigationsParams = never;

const searchInvestigationsIR: any = {
  usedParamSet: { searchTerm: true, limit: true },
  params: [
    {
      name: 'searchTerm',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 155, b: 166 },
        { a: 269, b: 280 },
        { a: 368, b: 379 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 407, b: 413 }] },
  ],
  statement:
    "SELECT\n  id,\n  uuid,\n  title,\n  description,\n  status,\n  ts_headline('english', title || ' ' || coalesce(description, ''), websearch_to_tsquery('english', :searchTerm!),\n    'MaxWords=25,MinWords=8') AS snippet,\n  ts_rank_cd(fts_vector, websearch_to_tsquery('english', :searchTerm!), 32) AS rank\nFROM investigations\nWHERE fts_vector @@ websearch_to_tsquery('english', :searchTerm!)\nORDER BY rank DESC\nLIMIT :limit!",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   id,
 *   uuid,
 *   title,
 *   description,
 *   status,
 *   ts_headline('english', title || ' ' || coalesce(description, ''), websearch_to_tsquery('english', :searchTerm!),
 *     'MaxWords=25,MinWords=8') AS snippet,
 *   ts_rank_cd(fts_vector, websearch_to_tsquery('english', :searchTerm!), 32) AS rank
 * FROM investigations
 * WHERE fts_vector @@ websearch_to_tsquery('english', :searchTerm!)
 * ORDER BY rank DESC
 * LIMIT :limit!
 * ```
 */
export const searchInvestigations = new PreparedQuery<
  ISearchInvestigationsParams,
  ISearchInvestigationsResult
>(searchInvestigationsIR);

/** Query 'SearchArticles' is invalid, so its result is assigned type 'never'.
 *  */
export type ISearchArticlesResult = never;

/** Query 'SearchArticles' is invalid, so its parameters are assigned type 'never'.
 *  */
export type ISearchArticlesParams = never;

const searchArticlesIR: any = {
  usedParamSet: { searchTerm: true, limit: true },
  params: [
    {
      name: 'searchTerm',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 199, b: 210 },
        { a: 313, b: 324 },
        { a: 406, b: 417 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 445, b: 451 }] },
  ],
  statement:
    "SELECT\n  id,\n  title,\n  source,\n  author,\n  pub_date AS \"pubDate\",\n  ts_headline('english', title || ' ' || coalesce(description, '') || ' ' || coalesce(content, ''), websearch_to_tsquery('english', :searchTerm!),\n    'MaxWords=25,MinWords=8') AS snippet,\n  ts_rank_cd(fts_vector, websearch_to_tsquery('english', :searchTerm!), 32) AS rank\nFROM articles\nWHERE fts_vector @@ websearch_to_tsquery('english', :searchTerm!)\nORDER BY rank DESC\nLIMIT :limit!",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   id,
 *   title,
 *   source,
 *   author,
 *   pub_date AS "pubDate",
 *   ts_headline('english', title || ' ' || coalesce(description, '') || ' ' || coalesce(content, ''), websearch_to_tsquery('english', :searchTerm!),
 *     'MaxWords=25,MinWords=8') AS snippet,
 *   ts_rank_cd(fts_vector, websearch_to_tsquery('english', :searchTerm!), 32) AS rank
 * FROM articles
 * WHERE fts_vector @@ websearch_to_tsquery('english', :searchTerm!)
 * ORDER BY rank DESC
 * LIMIT :limit!
 * ```
 */
export const searchArticles = new PreparedQuery<ISearchArticlesParams, ISearchArticlesResult>(
  searchArticlesIR,
);

/** Query 'SearchMedia' is invalid, so its result is assigned type 'never'.
 *  */
export type ISearchMediaResult = never;

/** Query 'SearchMedia' is invalid, so its parameters are assigned type 'never'.
 *  */
export type ISearchMediaParams = never;

const searchMediaIR: any = {
  usedParamSet: { searchTerm: true, limit: true },
  params: [
    {
      name: 'searchTerm',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 252, b: 263 },
        { a: 366, b: 377 },
        { a: 462, b: 473 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 501, b: 507 }] },
  ],
  statement:
    "SELECT\n  id,\n  file_path AS \"filename\",\n  title,\n  description,\n  file_path AS \"filePath\",\n  file_type AS \"fileType\",\n  ts_headline('english', file_path || ' ' || coalesce(title, '') || ' ' || coalesce(description, ''), websearch_to_tsquery('english', :searchTerm!),\n    'MaxWords=25,MinWords=8') AS snippet,\n  ts_rank_cd(fts_vector, websearch_to_tsquery('english', :searchTerm!), 32) AS rank\nFROM media_items\nWHERE fts_vector @@ websearch_to_tsquery('english', :searchTerm!)\nORDER BY rank DESC\nLIMIT :limit!",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   id,
 *   file_path AS "filename",
 *   title,
 *   description,
 *   file_path AS "filePath",
 *   file_type AS "fileType",
 *   ts_headline('english', file_path || ' ' || coalesce(title, '') || ' ' || coalesce(description, ''), websearch_to_tsquery('english', :searchTerm!),
 *     'MaxWords=25,MinWords=8') AS snippet,
 *   ts_rank_cd(fts_vector, websearch_to_tsquery('english', :searchTerm!), 32) AS rank
 * FROM media_items
 * WHERE fts_vector @@ websearch_to_tsquery('english', :searchTerm!)
 * ORDER BY rank DESC
 * LIMIT :limit!
 * ```
 */
export const searchMedia = new PreparedQuery<ISearchMediaParams, ISearchMediaResult>(searchMediaIR);

/** Query 'SearchDocumentsSemantic' is invalid, so its result is assigned type 'never'.
 *  */
export type ISearchDocumentsSemanticResult = never;

/** Query 'SearchDocumentsSemantic' is invalid, so its parameters are assigned type 'never'.
 *  */
export type ISearchDocumentsSemanticParams = never;

const searchDocumentsSemanticIR: any = {
  usedParamSet: { embedding: true, evidenceType: true, limit: true },
  params: [
    {
      name: 'embedding',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 199, b: 208 }],
    },
    {
      name: 'evidenceType',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 247, b: 259 },
        { a: 294, b: 306 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 346, b: 352 }] },
  ],
  statement:
    'SELECT\n  id,\n  file_name           AS "fileName",\n  file_path           AS "filePath",\n  evidence_type       AS "evidenceType",\n  red_flag_rating     AS "redFlagRating",\n  1 - (content_embedding <=> :embedding) AS similarity\nFROM documents\nWHERE (:evidenceType::text IS NULL OR evidence_type = :evidenceType::text)\nORDER BY similarity DESC\nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   id,
 *   file_name           AS "fileName",
 *   file_path           AS "filePath",
 *   evidence_type       AS "evidenceType",
 *   red_flag_rating     AS "redFlagRating",
 *   1 - (content_embedding <=> :embedding) AS similarity
 * FROM documents
 * WHERE (:evidenceType::text IS NULL OR evidence_type = :evidenceType::text)
 * ORDER BY similarity DESC
 * LIMIT :limit!
 * ```
 */
export const searchDocumentsSemantic = new PreparedQuery<
  ISearchDocumentsSemanticParams,
  ISearchDocumentsSemanticResult
>(searchDocumentsSemanticIR);

/** Query 'SearchEntitiesSemantic' is invalid, so its result is assigned type 'never'.
 *  */
export type ISearchEntitiesSemanticResult = never;

/** Query 'SearchEntitiesSemantic' is invalid, so its parameters are assigned type 'never'.
 *  */
export type ISearchEntitiesSemanticParams = never;

const searchEntitiesSemanticIR: any = {
  usedParamSet: { embedding: true, limit: true },
  params: [
    {
      name: 'embedding',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 121, b: 130 }],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 1530, b: 1536 }] },
  ],
  statement:
    "SELECT\n  id,\n  full_name          AS \"fullName\",\n  primary_role       AS \"primaryRole\",\n  1 - (description_embedding <=> :embedding) AS similarity\nFROM entities\nWHERE COALESCE(junk_tier, 'clean') = 'clean'\n  AND COALESCE(quarantine_status, 0) = 0\n  AND full_name IS NOT NULL\n  AND BTRIM(full_name) != ''\n  AND LOWER(full_name) !~* '^(to|from|cc|bcc|subject|re|fwd|fw|sent|received)\\M[:\\s-]*'\n  AND LOWER(full_name) !~* '^(on|at|in|with)\\s+(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\\M'\n  AND LOWER(full_name) !~* '\\m(mon|tue|wed|thu|fri|sat|sun)\\M\\s*$'\n  AND LOWER(full_name) !~* '\\m([[:alpha:]]{3,})\\s+\\1\\M'\n  AND LOWER(full_name) !~* '\\m(department|office|policy|inc|llc|corp|corporation|ltd|associates|foundation|trust|university|school|academy|committee|ministry|agency|bureau|division|building|street|road|avenue|contact|privacy|terms)\\M'\n  AND LOWER(full_name) !~* '\\m(bluray|blu-ray|disc|rewritable|dumpster|hauls|columns|demolition|ditchin|postage|acoustics|personnel|persoanel)\\M'\n  AND LOWER(full_name) !~* '^(east|west|north|south)\\s+(if|aft|aftstreet|street|road|avenue)\\M'\n  AND LOWER(full_name) !~* '\\m(direction|provided)\\M\\s*$'\n  AND LOWER(full_name) !~* '\\m(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\\M\\s*$'\n  AND LOWER(full_name) !~* '\\m[[:alpha:]]+''?s\\s+(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\\M'\n  AND LOWER(full_name) !~* '^(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\\M'\nORDER BY similarity DESC\nLIMIT :limit!",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   id,
 *   full_name          AS "fullName",
 *   primary_role       AS "primaryRole",
 *   1 - (description_embedding <=> :embedding) AS similarity
 * FROM entities
 * WHERE COALESCE(junk_tier, 'clean') = 'clean'
 *   AND COALESCE(quarantine_status, 0) = 0
 *   AND full_name IS NOT NULL
 *   AND BTRIM(full_name) != ''
 *   AND LOWER(full_name) !~* '^(to|from|cc|bcc|subject|re|fwd|fw|sent|received)\M[:\s-]*'
 *   AND LOWER(full_name) !~* '^(on|at|in|with)\s+(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\M'
 *   AND LOWER(full_name) !~* '\m(mon|tue|wed|thu|fri|sat|sun)\M\s*$'
 *   AND LOWER(full_name) !~* '\m([[:alpha:]]{3,})\s+\1\M'
 *   AND LOWER(full_name) !~* '\m(department|office|policy|inc|llc|corp|corporation|ltd|associates|foundation|trust|university|school|academy|committee|ministry|agency|bureau|division|building|street|road|avenue|contact|privacy|terms)\M'
 *   AND LOWER(full_name) !~* '\m(bluray|blu-ray|disc|rewritable|dumpster|hauls|columns|demolition|ditchin|postage|acoustics|personnel|persoanel)\M'
 *   AND LOWER(full_name) !~* '^(east|west|north|south)\s+(if|aft|aftstreet|street|road|avenue)\M'
 *   AND LOWER(full_name) !~* '\m(direction|provided)\M\s*$'
 *   AND LOWER(full_name) !~* '\m(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M\s*$'
 *   AND LOWER(full_name) !~* '\m[[:alpha:]]+''?s\s+(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M'
 *   AND LOWER(full_name) !~* '^(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M'
 * ORDER BY similarity DESC
 * LIMIT :limit!
 * ```
 */
export const searchEntitiesSemantic = new PreparedQuery<
  ISearchEntitiesSemanticParams,
  ISearchEntitiesSemanticResult
>(searchEntitiesSemanticIR);
