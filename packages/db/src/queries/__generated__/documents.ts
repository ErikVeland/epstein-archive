/** Types generated for queries found in "src/queries/documents.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type NumberOrString = number | string;

export type stringArray = string[];

/** 'GetDocuments' parameters type */
export interface IGetDocumentsParams {
  endDate?: DateOrString | null | void;
  evidenceType?: string | null | void;
  fileTypes?: stringArray | null | void;
  limit: NumberOrString;
  maxRedFlag?: number | null | void;
  minRedFlag?: number | null | void;
  offset: NumberOrString;
  search?: string | null | void;
  sources?: stringArray | null | void;
  startDate?: DateOrString | null | void;
}

/** 'GetDocuments' return type */
export interface IGetDocumentsResult {
  contentRefined: string | null;
  dateCreated: Date | null;
  evidenceType: string | null;
  extractedDate: Date | null;
  fileName: string | null;
  fileSize: string | null;
  fileType: string | null;
  id: string;
  metadata: Json | null;
  redFlagRating: number | null;
  sourceCollection: string | null;
  title: string | null;
  totalCount: string | null;
  wordCount: number | null;
}

/** 'GetDocuments' query type */
export interface IGetDocumentsQuery {
  params: IGetDocumentsParams;
  result: IGetDocumentsResult;
}

const getDocumentsIR: any = {
  usedParamSet: {
    search: true,
    fileTypes: true,
    evidenceType: true,
    sources: true,
    startDate: true,
    endDate: true,
    minRedFlag: true,
    maxRedFlag: true,
    limit: true,
    offset: true,
  },
  params: [
    {
      name: 'search',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 490, b: 496 },
        { a: 531, b: 537 },
        { a: 566, b: 572 },
        { a: 593, b: 599 },
      ],
    },
    {
      name: 'fileTypes',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 625, b: 634 },
        { a: 640, b: 649 },
      ],
    },
    {
      name: 'evidenceType',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 683, b: 695 },
        { a: 700, b: 712 },
      ],
    },
    {
      name: 'sources',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 754, b: 761 },
        { a: 767, b: 774 },
      ],
    },
    {
      name: 'startDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 834, b: 843 },
        { a: 848, b: 857 },
      ],
    },
    {
      name: 'endDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 917, b: 924 },
        { a: 929, b: 936 },
      ],
    },
    {
      name: 'minRedFlag',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 973, b: 983 },
        { a: 988, b: 998 },
      ],
    },
    {
      name: 'maxRedFlag',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 1035, b: 1045 },
        { a: 1050, b: 1060 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 1152, b: 1158 }] },
    { name: 'offset', required: true, transform: { type: 'scalar' }, locs: [{ a: 1167, b: 1174 }] },
  ],
  statement:
    'SELECT \n  id,\n  file_name as "fileName",\n  file_type as "fileType",\n  file_size as "fileSize",\n  date_created as "dateCreated",\n  extracted_date as "extractedDate",\n  content_refined as "contentRefined",\n  evidence_type as "evidenceType",\n  metadata_json as "metadata",\n  word_count as "wordCount",\n  red_flag_rating as "redFlagRating",\n  COALESCE(NULLIF(title, \'\'), file_name) as "title",\n  source_collection as "sourceCollection",\n  COUNT(*) OVER () as "totalCount"\nFROM documents\nWHERE (:search::text IS NULL OR file_name ILIKE :search OR source_collection ILIKE :search OR file_path ILIKE :search)\n  AND (file_type = ANY(:fileTypes) OR :fileTypes IS NULL)\n  AND (evidence_type = :evidenceType OR :evidenceType IS NULL)\n  AND (source_collection = ANY(:sources) OR :sources IS NULL)\n  AND (COALESCE(extracted_date, date_created) >= :startDate OR :startDate IS NULL)\n  AND (COALESCE(extracted_date, date_created) <= :endDate OR :endDate IS NULL)\n  AND (red_flag_rating >= :minRedFlag OR :minRedFlag IS NULL)\n  AND (red_flag_rating <= :maxRedFlag OR :maxRedFlag IS NULL)\nORDER BY red_flag_rating DESC, COALESCE(extracted_date, date_created) DESC\nLIMIT :limit! OFFSET :offset!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   id,
 *   file_name as "fileName",
 *   file_type as "fileType",
 *   file_size as "fileSize",
 *   date_created as "dateCreated",
 *   extracted_date as "extractedDate",
 *   content_refined as "contentRefined",
 *   evidence_type as "evidenceType",
 *   metadata_json as "metadata",
 *   word_count as "wordCount",
 *   red_flag_rating as "redFlagRating",
 *   COALESCE(NULLIF(title, ''), file_name) as "title",
 *   source_collection as "sourceCollection",
 *   COUNT(*) OVER () as "totalCount"
 * FROM documents
 * WHERE (:search::text IS NULL OR file_name ILIKE :search OR source_collection ILIKE :search OR file_path ILIKE :search)
 *   AND (file_type = ANY(:fileTypes) OR :fileTypes IS NULL)
 *   AND (evidence_type = :evidenceType OR :evidenceType IS NULL)
 *   AND (source_collection = ANY(:sources) OR :sources IS NULL)
 *   AND (COALESCE(extracted_date, date_created) >= :startDate OR :startDate IS NULL)
 *   AND (COALESCE(extracted_date, date_created) <= :endDate OR :endDate IS NULL)
 *   AND (red_flag_rating >= :minRedFlag OR :minRedFlag IS NULL)
 *   AND (red_flag_rating <= :maxRedFlag OR :maxRedFlag IS NULL)
 * ORDER BY red_flag_rating DESC, COALESCE(extracted_date, date_created) DESC
 * LIMIT :limit! OFFSET :offset!
 * ```
 */
export const getDocuments = new PreparedQuery<IGetDocumentsParams, IGetDocumentsResult>(
  getDocumentsIR,
);

/** 'CountDocuments' parameters type */
export interface ICountDocumentsParams {
  endDate?: DateOrString | null | void;
  evidenceType?: string | null | void;
  fileTypes?: stringArray | null | void;
  maxRedFlag?: number | null | void;
  minRedFlag?: number | null | void;
  search?: string | null | void;
  sources?: stringArray | null | void;
  startDate?: DateOrString | null | void;
}

/** 'CountDocuments' return type */
export interface ICountDocumentsResult {
  total: string | null;
}

/** 'CountDocuments' query type */
export interface ICountDocumentsQuery {
  params: ICountDocumentsParams;
  result: ICountDocumentsResult;
}

const countDocumentsIR: any = {
  usedParamSet: {
    search: true,
    fileTypes: true,
    evidenceType: true,
    sources: true,
    startDate: true,
    endDate: true,
    minRedFlag: true,
    maxRedFlag: true,
  },
  params: [
    {
      name: 'search',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 48, b: 54 },
        { a: 89, b: 95 },
        { a: 124, b: 130 },
        { a: 151, b: 157 },
      ],
    },
    {
      name: 'fileTypes',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 183, b: 192 },
        { a: 198, b: 207 },
      ],
    },
    {
      name: 'evidenceType',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 241, b: 253 },
        { a: 258, b: 270 },
      ],
    },
    {
      name: 'sources',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 312, b: 319 },
        { a: 325, b: 332 },
      ],
    },
    {
      name: 'startDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 392, b: 401 },
        { a: 406, b: 415 },
      ],
    },
    {
      name: 'endDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 475, b: 482 },
        { a: 487, b: 494 },
      ],
    },
    {
      name: 'minRedFlag',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 531, b: 541 },
        { a: 546, b: 556 },
      ],
    },
    {
      name: 'maxRedFlag',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 593, b: 603 },
        { a: 608, b: 618 },
      ],
    },
  ],
  statement:
    'SELECT COUNT(*) as total \nFROM documents\nWHERE (:search::text IS NULL OR file_name ILIKE :search OR source_collection ILIKE :search OR file_path ILIKE :search)\n  AND (file_type = ANY(:fileTypes) OR :fileTypes IS NULL)\n  AND (evidence_type = :evidenceType OR :evidenceType IS NULL)\n  AND (source_collection = ANY(:sources) OR :sources IS NULL)\n  AND (COALESCE(extracted_date, date_created) >= :startDate OR :startDate IS NULL)\n  AND (COALESCE(extracted_date, date_created) <= :endDate OR :endDate IS NULL)\n  AND (red_flag_rating >= :minRedFlag OR :minRedFlag IS NULL)\n  AND (red_flag_rating <= :maxRedFlag OR :maxRedFlag IS NULL)',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(*) as total
 * FROM documents
 * WHERE (:search::text IS NULL OR file_name ILIKE :search OR source_collection ILIKE :search OR file_path ILIKE :search)
 *   AND (file_type = ANY(:fileTypes) OR :fileTypes IS NULL)
 *   AND (evidence_type = :evidenceType OR :evidenceType IS NULL)
 *   AND (source_collection = ANY(:sources) OR :sources IS NULL)
 *   AND (COALESCE(extracted_date, date_created) >= :startDate OR :startDate IS NULL)
 *   AND (COALESCE(extracted_date, date_created) <= :endDate OR :endDate IS NULL)
 *   AND (red_flag_rating >= :minRedFlag OR :minRedFlag IS NULL)
 *   AND (red_flag_rating <= :maxRedFlag OR :maxRedFlag IS NULL)
 * ```
 */
export const countDocuments = new PreparedQuery<ICountDocumentsParams, ICountDocumentsResult>(
  countDocumentsIR,
);

/** 'GetDocumentById' parameters type */
export interface IGetDocumentByIdParams {
  id: NumberOrString;
}

/** 'GetDocumentById' return type */
export interface IGetDocumentByIdResult {
  content: string | null;
  contentHash: string | null;
  dateCreated: Date | null;
  evidenceType: string | null;
  extractedDate: Date | null;
  fileName: string | null;
  filePath: string | null;
  fileSize: string | null;
  fileType: string | null;
  id: string;
  metadataJson: Json | null;
  originalFilePath: string | null;
  redactionCoverageAfter: number | null;
  redactionCoverageBefore: number | null;
  redFlagRating: number | null;
  title: string | null;
  unredactedTextGain: number | null;
  unredactionAttempted: number | null;
  unredactionBaselineVocab: string | null;
  unredactionSucceeded: number | null;
  wordCount: number | null;
}

/** 'GetDocumentById' query type */
export interface IGetDocumentByIdQuery {
  params: IGetDocumentByIdParams;
  result: IGetDocumentByIdResult;
}

const getDocumentByIdIR: any = {
  usedParamSet: { id: true },
  params: [
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 796, b: 799 }] },
  ],
  statement:
    'SELECT \n  id,\n  file_name as "fileName",\n  file_path as "filePath",\n  file_type as "fileType",\n  file_size as "fileSize",\n  date_created as "dateCreated",\n  extracted_date as "extractedDate",\n  content_hash as "contentHash",\n  word_count as "wordCount",\n  red_flag_rating as "redFlagRating",\n  metadata_json as "metadataJson",\n  content_refined as "content",\n  title,\n  evidence_type as "evidenceType",\n  unredaction_attempted as "unredactionAttempted",\n  unredaction_succeeded as "unredactionSucceeded",\n  redaction_coverage_before as "redactionCoverageBefore",\n  redaction_coverage_after as "redactionCoverageAfter",\n  unredacted_text_gain as "unredactedTextGain",\n  unredaction_baseline_vocab as "unredactionBaselineVocab",\n  original_file_path as "originalFilePath"\nFROM documents\nWHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   id,
 *   file_name as "fileName",
 *   file_path as "filePath",
 *   file_type as "fileType",
 *   file_size as "fileSize",
 *   date_created as "dateCreated",
 *   extracted_date as "extractedDate",
 *   content_hash as "contentHash",
 *   word_count as "wordCount",
 *   red_flag_rating as "redFlagRating",
 *   metadata_json as "metadataJson",
 *   content_refined as "content",
 *   title,
 *   evidence_type as "evidenceType",
 *   unredaction_attempted as "unredactionAttempted",
 *   unredaction_succeeded as "unredactionSucceeded",
 *   redaction_coverage_before as "redactionCoverageBefore",
 *   redaction_coverage_after as "redactionCoverageAfter",
 *   unredacted_text_gain as "unredactedTextGain",
 *   unredaction_baseline_vocab as "unredactionBaselineVocab",
 *   original_file_path as "originalFilePath"
 * FROM documents
 * WHERE id = :id!
 * ```
 */
export const getDocumentById = new PreparedQuery<IGetDocumentByIdParams, IGetDocumentByIdResult>(
  getDocumentByIdIR,
);

/** 'GetDocumentEntities' parameters type */
export interface IGetDocumentEntitiesParams {
  documentId: NumberOrString;
}

/** 'GetDocumentEntities' return type */
export interface IGetDocumentEntitiesResult {
  entityId: string;
  entityType: string | null;
  mentions: string | null;
  name: string;
  redFlagRating: number | null;
}

/** 'GetDocumentEntities' query type */
export interface IGetDocumentEntitiesQuery {
  params: IGetDocumentEntitiesParams;
  result: IGetDocumentEntitiesResult;
}

const getDocumentEntitiesIR: any = {
  usedParamSet: { documentId: true },
  params: [
    {
      name: 'documentId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 272, b: 283 }],
    },
  ],
  statement:
    'SELECT\n  e.id as "entityId",\n  e.full_name as "name",\n  COALESCE(e.entity_type, \'unknown\') as "entityType",\n  COALESCE(e.red_flag_rating, 0) as "redFlagRating",\n  COUNT(*) as "mentions"\nFROM entity_mentions em\nJOIN entities e ON e.id = em.entity_id\nWHERE em.document_id = :documentId!\nGROUP BY e.id, e.full_name, e.entity_type, e.red_flag_rating\nORDER BY mentions DESC, "redFlagRating" DESC, e.full_name ASC\nLIMIT 200',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   e.id as "entityId",
 *   e.full_name as "name",
 *   COALESCE(e.entity_type, 'unknown') as "entityType",
 *   COALESCE(e.red_flag_rating, 0) as "redFlagRating",
 *   COUNT(*) as "mentions"
 * FROM entity_mentions em
 * JOIN entities e ON e.id = em.entity_id
 * WHERE em.document_id = :documentId!
 * GROUP BY e.id, e.full_name, e.entity_type, e.red_flag_rating
 * ORDER BY mentions DESC, "redFlagRating" DESC, e.full_name ASC
 * LIMIT 200
 * ```
 */
export const getDocumentEntities = new PreparedQuery<
  IGetDocumentEntitiesParams,
  IGetDocumentEntitiesResult
>(getDocumentEntitiesIR);

/** 'GetMentionContexts' parameters type */
export interface IGetMentionContextsParams {
  documentId: NumberOrString;
  entityId: NumberOrString;
}

/** 'GetMentionContexts' return type */
export interface IGetMentionContextsResult {
  mention_context: string | null;
}

/** 'GetMentionContexts' query type */
export interface IGetMentionContextsQuery {
  params: IGetMentionContextsParams;
  result: IGetMentionContextsResult;
}

const getMentionContextsIR: any = {
  usedParamSet: { documentId: true, entityId: true },
  params: [
    { name: 'documentId', required: true, transform: { type: 'scalar' }, locs: [{ a: 64, b: 75 }] },
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 93, b: 102 }] },
  ],
  statement:
    "SELECT mention_context\nFROM entity_mentions\nWHERE document_id = :documentId! AND entity_id = :entityId! AND mention_context IS NOT NULL AND mention_context != ''\nLIMIT 3",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT mention_context
 * FROM entity_mentions
 * WHERE document_id = :documentId! AND entity_id = :entityId! AND mention_context IS NOT NULL AND mention_context != ''
 * LIMIT 3
 * ```
 */
export const getMentionContexts = new PreparedQuery<
  IGetMentionContextsParams,
  IGetMentionContextsResult
>(getMentionContextsIR);

/** 'GetRedactionSpans' parameters type */
export interface IGetRedactionSpansParams {
  documentId: NumberOrString;
}

/** 'GetRedactionSpans' return type */
export interface IGetRedactionSpansResult {
  created_at: Date | null;
  document_id: string;
  id: string;
  replacement_text: string | null;
  span_end: number;
  span_start: number;
}

/** 'GetRedactionSpans' query type */
export interface IGetRedactionSpansQuery {
  params: IGetRedactionSpansParams;
  result: IGetRedactionSpansResult;
}

const getRedactionSpansIR: any = {
  usedParamSet: { documentId: true },
  params: [
    { name: 'documentId', required: true, transform: { type: 'scalar' }, locs: [{ a: 50, b: 61 }] },
  ],
  statement:
    'SELECT * FROM redaction_spans WHERE document_id = :documentId! ORDER BY span_start ASC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT * FROM redaction_spans WHERE document_id = :documentId! ORDER BY span_start ASC
 * ```
 */
export const getRedactionSpans = new PreparedQuery<
  IGetRedactionSpansParams,
  IGetRedactionSpansResult
>(getRedactionSpansIR);

/** 'GetClaimTriples' parameters type */
export interface IGetClaimTriplesParams {
  documentId: NumberOrString;
}

/** 'GetClaimTriples' return type */
export interface IGetClaimTriplesResult {
  confidence: number | null;
  created_at: Date | null;
  document_id: string | null;
  evidence_json: Json | null;
  id: string;
  modality: string | null;
  object_entity_id: string | null;
  object_name: string;
  object_text: string | null;
  predicate: string | null;
  rejection_reason: string | null;
  sentence_id: string | null;
  subject_entity_id: string | null;
  subject_name: string;
  verified: number | null;
  verified_at: Date | null;
  verified_by: string | null;
}

/** 'GetClaimTriples' query type */
export interface IGetClaimTriplesQuery {
  params: IGetClaimTriplesParams;
  result: IGetClaimTriplesResult;
}

const getClaimTriplesIR: any = {
  usedParamSet: { documentId: true },
  params: [
    {
      name: 'documentId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 217, b: 228 }],
    },
  ],
  statement:
    'SELECT ct.*, s.full_name as subject_name, o.full_name as object_name\nFROM claim_triples ct\nLEFT JOIN entities s ON ct.subject_entity_id = s.id\nLEFT JOIN entities o ON ct.object_entity_id = o.id\nWHERE ct.document_id = :documentId!\nORDER BY ct.confidence DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT ct.*, s.full_name as subject_name, o.full_name as object_name
 * FROM claim_triples ct
 * LEFT JOIN entities s ON ct.subject_entity_id = s.id
 * LEFT JOIN entities o ON ct.object_entity_id = o.id
 * WHERE ct.document_id = :documentId!
 * ORDER BY ct.confidence DESC
 * ```
 */
export const getClaimTriples = new PreparedQuery<IGetClaimTriplesParams, IGetClaimTriplesResult>(
  getClaimTriplesIR,
);

/** 'GetDocumentSentences' parameters type */
export interface IGetDocumentSentencesParams {
  documentId: NumberOrString;
}

/** 'GetDocumentSentences' return type */
export interface IGetDocumentSentencesResult {
  id: string;
  is_boilerplate: number | null;
  sentence_index: number | null;
  sentence_text: string | null;
  signal_score: number | null;
}

/** 'GetDocumentSentences' query type */
export interface IGetDocumentSentencesQuery {
  params: IGetDocumentSentencesParams;
  result: IGetDocumentSentencesResult;
}

const getDocumentSentencesIR: any = {
  usedParamSet: { documentId: true },
  params: [
    {
      name: 'documentId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 115, b: 126 }],
    },
  ],
  statement:
    'SELECT id, sentence_index, sentence_text, is_boilerplate, signal_score\nFROM document_sentences\nWHERE document_id = :documentId!\nORDER BY sentence_index ASC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, sentence_index, sentence_text, is_boilerplate, signal_score
 * FROM document_sentences
 * WHERE document_id = :documentId!
 * ORDER BY sentence_index ASC
 * ```
 */
export const getDocumentSentences = new PreparedQuery<
  IGetDocumentSentencesParams,
  IGetDocumentSentencesResult
>(getDocumentSentencesIR);

/** 'GetRelatedDocuments' parameters type */
export interface IGetRelatedDocumentsParams {
  documentId: NumberOrString;
  limit: NumberOrString;
}

/** 'GetRelatedDocuments' return type */
export interface IGetRelatedDocumentsResult {
  dateCreated: Date | null;
  evidenceType: string | null;
  fileName: string | null;
  fileType: string | null;
  id: string;
  redFlagRating: number | null;
  sharedEntitiesList: string | null;
  sharedEntityCount: string | null;
  title: string | null;
}

/** 'GetRelatedDocuments' query type */
export interface IGetRelatedDocumentsQuery {
  params: IGetRelatedDocumentsParams;
  result: IGetRelatedDocumentsResult;
}

const getRelatedDocumentsIR: any = {
  usedParamSet: { documentId: true, limit: true },
  params: [
    {
      name: 'documentId',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 550, b: 561 },
        { a: 579, b: 590 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 824, b: 830 }] },
  ],
  statement:
    'SELECT \n  d.id,\n  COALESCE(NULLIF(d.title, \'\'), d.file_name) as title,\n  d.file_name as "fileName",\n  d.file_type as "fileType",\n  d.evidence_type as "evidenceType",\n  d.red_flag_rating as "redFlagRating",\n  d.date_created as "dateCreated",\n  COUNT(DISTINCT em.entity_id) as "sharedEntityCount",\n  STRING_AGG(DISTINCT e.full_name, \', \') as "sharedEntitiesList"\nFROM documents d\nJOIN entity_mentions em ON d.id = em.document_id\nJOIN entities e ON em.entity_id = e.id\nWHERE em.entity_id IN (\n  SELECT entity_id FROM entity_mentions WHERE document_id = :documentId!\n)\n  AND d.id != :documentId!\nGROUP BY d.id, d.title, d.file_name, d.file_type, d.evidence_type, d.red_flag_rating, d.date_created, d.extracted_date\nORDER BY "sharedEntityCount" DESC, d.red_flag_rating DESC, COALESCE(d.extracted_date, d.date_created) DESC\nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   d.id,
 *   COALESCE(NULLIF(d.title, ''), d.file_name) as title,
 *   d.file_name as "fileName",
 *   d.file_type as "fileType",
 *   d.evidence_type as "evidenceType",
 *   d.red_flag_rating as "redFlagRating",
 *   d.date_created as "dateCreated",
 *   COUNT(DISTINCT em.entity_id) as "sharedEntityCount",
 *   STRING_AGG(DISTINCT e.full_name, ', ') as "sharedEntitiesList"
 * FROM documents d
 * JOIN entity_mentions em ON d.id = em.document_id
 * JOIN entities e ON em.entity_id = e.id
 * WHERE em.entity_id IN (
 *   SELECT entity_id FROM entity_mentions WHERE document_id = :documentId!
 * )
 *   AND d.id != :documentId!
 * GROUP BY d.id, d.title, d.file_name, d.file_type, d.evidence_type, d.red_flag_rating, d.date_created, d.extracted_date
 * ORDER BY "sharedEntityCount" DESC, d.red_flag_rating DESC, COALESCE(d.extracted_date, d.date_created) DESC
 * LIMIT :limit!
 * ```
 */
export const getRelatedDocuments = new PreparedQuery<
  IGetRelatedDocumentsParams,
  IGetRelatedDocumentsResult
>(getRelatedDocumentsIR);
