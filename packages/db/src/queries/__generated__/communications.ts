/** Types generated for queries found in "src/queries/communications.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type NumberOrString = number | string;

/** 'GetThreads' parameters type */
export interface IGetThreadsParams {
  limit: NumberOrString;
  offset: NumberOrString;
}

/** 'GetThreads' return type */
export interface IGetThreadsResult {
  firstDate: Date | null;
  lastDate: Date | null;
  messageCount: number | null;
  participantsJson: Json | null;
  previewSnippet: string | null;
  subjectCanonical: string | null;
  threadId: string | null;
}

/** 'GetThreads' query type */
export interface IGetThreadsQuery {
  params: IGetThreadsParams;
  result: IGetThreadsResult;
}

const getThreadsIR: any = {
  usedParamSet: { limit: true, offset: true },
  params: [
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 477, b: 483 }] },
    { name: 'offset', required: true, transform: { type: 'scalar' }, locs: [{ a: 492, b: 499 }] },
  ],
  statement:
    'SELECT \n  COALESCE(metadata_json->>\'thread_id\', id::text) as "threadId",\n  MIN(metadata_json->>\'subject\') as "subjectCanonical",\n  COUNT(*)::integer as "messageCount",\n  MIN(date_created) as "firstDate",\n  MAX(date_created) as "lastDate",\n  jsonb_agg(metadata_json->>\'from\') as "participantsJson",\n  (SELECT content FROM documents d2 WHERE d2.id = MAX(d.id)) as "previewSnippet"\nFROM documents d\nWHERE evidence_type = \'email\'\nGROUP BY "threadId"\nORDER BY "lastDate" DESC\nLIMIT :limit! OFFSET :offset!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   COALESCE(metadata_json->>'thread_id', id::text) as "threadId",
 *   MIN(metadata_json->>'subject') as "subjectCanonical",
 *   COUNT(*)::integer as "messageCount",
 *   MIN(date_created) as "firstDate",
 *   MAX(date_created) as "lastDate",
 *   jsonb_agg(metadata_json->>'from') as "participantsJson",
 *   (SELECT content FROM documents d2 WHERE d2.id = MAX(d.id)) as "previewSnippet"
 * FROM documents d
 * WHERE evidence_type = 'email'
 * GROUP BY "threadId"
 * ORDER BY "lastDate" DESC
 * LIMIT :limit! OFFSET :offset!
 * ```
 */
export const getThreads = new PreparedQuery<IGetThreadsParams, IGetThreadsResult>(getThreadsIR);

/** 'GetThreadMessages' parameters type */
export interface IGetThreadMessagesParams {
  threadId?: string | null | void;
}

/** 'GetThreadMessages' return type */
export interface IGetThreadMessagesResult {
  content: string | null;
  dateCreated: Date | null;
  evidenceType: string | null;
  id: string;
  metadataJson: Json | null;
}

/** 'GetThreadMessages' query type */
export interface IGetThreadMessagesQuery {
  params: IGetThreadMessagesParams;
  result: IGetThreadMessagesResult;
}

const getThreadMessagesIR: any = {
  usedParamSet: { threadId: true },
  params: [
    {
      name: 'threadId',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 199, b: 207 },
        { a: 225, b: 233 },
      ],
    },
  ],
  statement:
    'SELECT id, content, date_created as "dateCreated", evidence_type as "evidenceType", metadata_json as "metadataJson"\nFROM documents\nWHERE evidence_type = \'email\'\nAND (\n  metadata_json->>\'thread_id\' = :threadId\n  OR id::text = :threadId\n)\nORDER BY date_created ASC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, content, date_created as "dateCreated", evidence_type as "evidenceType", metadata_json as "metadataJson"
 * FROM documents
 * WHERE evidence_type = 'email'
 * AND (
 *   metadata_json->>'thread_id' = :threadId
 *   OR id::text = :threadId
 * )
 * ORDER BY date_created ASC
 * ```
 */
export const getThreadMessages = new PreparedQuery<
  IGetThreadMessagesParams,
  IGetThreadMessagesResult
>(getThreadMessagesIR);

/** 'GetThreadIdForDocument' parameters type */
export interface IGetThreadIdForDocumentParams {
  documentId: NumberOrString;
}

/** 'GetThreadIdForDocument' return type */
export interface IGetThreadIdForDocumentResult {
  threadId: string | null;
}

/** 'GetThreadIdForDocument' query type */
export interface IGetThreadIdForDocumentQuery {
  params: IGetThreadIdForDocumentParams;
  result: IGetThreadIdForDocumentResult;
}

const getThreadIdForDocumentIR: any = {
  usedParamSet: { documentId: true },
  params: [
    { name: 'documentId', required: true, transform: { type: 'scalar' }, locs: [{ a: 77, b: 88 }] },
  ],
  statement:
    'SELECT metadata_json->>\'thread_id\' as "threadId" \nFROM documents \nWHERE id = :documentId!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT metadata_json->>'thread_id' as "threadId"
 * FROM documents
 * WHERE id = :documentId!
 * ```
 */
export const getThreadIdForDocument = new PreparedQuery<
  IGetThreadIdForDocumentParams,
  IGetThreadIdForDocumentResult
>(getThreadIdForDocumentIR);

/** 'GetMessageById' parameters type */
export interface IGetMessageByIdParams {
  messageId: NumberOrString;
}

/** 'GetMessageById' return type */
export interface IGetMessageByIdResult {
  content: string | null;
  date_created: Date | null;
  file_name: string | null;
  id: string;
  metadata_json: Json | null;
}

/** 'GetMessageById' query type */
export interface IGetMessageByIdQuery {
  params: IGetMessageByIdParams;
  result: IGetMessageByIdResult;
}

const getMessageByIdIR: any = {
  usedParamSet: { messageId: true },
  params: [
    { name: 'messageId', required: true, transform: { type: 'scalar' }, locs: [{ a: 96, b: 106 }] },
  ],
  statement:
    "SELECT\n  id,\n  metadata_json,\n  file_name,\n  date_created,\n  content\nFROM documents \nWHERE id = :messageId! AND evidence_type = 'email'",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   id,
 *   metadata_json,
 *   file_name,
 *   date_created,
 *   content
 * FROM documents
 * WHERE id = :messageId! AND evidence_type = 'email'
 * ```
 */
export const getMessageById = new PreparedQuery<IGetMessageByIdParams, IGetMessageByIdResult>(
  getMessageByIdIR,
);

/** 'SearchThreads' parameters type */
export interface ISearchThreadsParams {
  query?: string | null | void;
}

/** 'SearchThreads' return type */
export interface ISearchThreadsResult {
  lastDate: Date | null;
  threadId: string | null;
}

/** 'SearchThreads' query type */
export interface ISearchThreadsQuery {
  params: ISearchThreadsParams;
  result: ISearchThreadsResult;
}

const searchThreadsIR: any = {
  usedParamSet: { query: true },
  params: [
    {
      name: 'query',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 183, b: 188 },
        { a: 224, b: 229 },
        { a: 282, b: 287 },
      ],
    },
  ],
  statement:
    "SELECT \n  COALESCE(metadata_json->>'thread_id', id::text) as \"threadId\",\n  MAX(date_created) as \"lastDate\"\nFROM documents\nWHERE evidence_type = 'email'\nAND (\n  file_name ILIKE '%' || :query || '%' OR \n  content ILIKE '%' || :query || '%' OR\n  metadata_json->>'subject' ILIKE '%' || :query || '%'\n)\nGROUP BY \"threadId\"\nORDER BY \"lastDate\" DESC\nLIMIT 50",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   COALESCE(metadata_json->>'thread_id', id::text) as "threadId",
 *   MAX(date_created) as "lastDate"
 * FROM documents
 * WHERE evidence_type = 'email'
 * AND (
 *   file_name ILIKE '%' || :query || '%' OR
 *   content ILIKE '%' || :query || '%' OR
 *   metadata_json->>'subject' ILIKE '%' || :query || '%'
 * )
 * GROUP BY "threadId"
 * ORDER BY "lastDate" DESC
 * LIMIT 50
 * ```
 */
export const searchThreads = new PreparedQuery<ISearchThreadsParams, ISearchThreadsResult>(
  searchThreadsIR,
);

/** 'GetCommunicationsForEntity' parameters type */
export interface IGetCommunicationsForEntityParams {
  entityId: NumberOrString;
}

/** 'GetCommunicationsForEntity' return type */
export interface IGetCommunicationsForEntityResult {
  content: string | null;
  date_created: Date | null;
  file_name: string | null;
  id: string;
  metadata_json: Json | null;
}

/** 'GetCommunicationsForEntity' query type */
export interface IGetCommunicationsForEntityQuery {
  params: IGetCommunicationsForEntityParams;
  result: IGetCommunicationsForEntityResult;
}

const getCommunicationsForEntityIR: any = {
  usedParamSet: { entityId: true },
  params: [
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 166, b: 175 }] },
  ],
  statement:
    "SELECT\n  d.id,\n  d.metadata_json,\n  d.file_name,\n  d.date_created,\n  d.content\nFROM entity_mentions em\nJOIN documents d ON em.document_id = d.id\nWHERE em.entity_id = :entityId! AND d.evidence_type = 'email'\nORDER BY d.date_created DESC\nLIMIT 500",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   d.id,
 *   d.metadata_json,
 *   d.file_name,
 *   d.date_created,
 *   d.content
 * FROM entity_mentions em
 * JOIN documents d ON em.document_id = d.id
 * WHERE em.entity_id = :entityId! AND d.evidence_type = 'email'
 * ORDER BY d.date_created DESC
 * LIMIT 500
 * ```
 */
export const getCommunicationsForEntity = new PreparedQuery<
  IGetCommunicationsForEntityParams,
  IGetCommunicationsForEntityResult
>(getCommunicationsForEntityIR);
