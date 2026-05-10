/** Types generated for queries found in "src/queries/review.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

/** 'GetMentionsQueue' parameters type */
export interface IGetMentionsQueueParams {
  limit: NumberOrString;
}

/** 'GetMentionsQueue' return type */
export interface IGetMentionsQueueResult {
  confidenceScore: number | null;
  documentId: string | null;
  entityId: string | null;
  entityName: string;
  fileName: string | null;
  id: string;
  mentionContext: string | null;
  signalScore: number | null;
}

/** 'GetMentionsQueue' query type */
export interface IGetMentionsQueueQuery {
  params: IGetMentionsQueueParams;
  result: IGetMentionsQueueResult;
}

const getMentionsQueueIR: any = {
  usedParamSet: { limit: true },
  params: [
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 472, b: 478 }] },
  ],
  statement:
    'SELECT\n  m.id, m.entity_id as "entityId", m.document_id as "documentId", m.mention_context as "mentionContext", m.confidence as "confidenceScore",\n  e.full_name as "entityName", d.file_name as "fileName", ds.signal_score as "signalScore"\nFROM entity_mentions m\nJOIN entities e ON m.entity_id = e.id\nJOIN documents d ON m.document_id = d.id\nLEFT JOIN document_sentences ds ON m.sentence_id = ds.id\nWHERE m.verified = 0\nORDER BY ds.signal_score DESC, m.confidence ASC\nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   m.id, m.entity_id as "entityId", m.document_id as "documentId", m.mention_context as "mentionContext", m.confidence as "confidenceScore",
 *   e.full_name as "entityName", d.file_name as "fileName", ds.signal_score as "signalScore"
 * FROM entity_mentions m
 * JOIN entities e ON m.entity_id = e.id
 * JOIN documents d ON m.document_id = d.id
 * LEFT JOIN document_sentences ds ON m.sentence_id = ds.id
 * WHERE m.verified = 0
 * ORDER BY ds.signal_score DESC, m.confidence ASC
 * LIMIT :limit!
 * ```
 */
export const getMentionsQueue = new PreparedQuery<IGetMentionsQueueParams, IGetMentionsQueueResult>(
  getMentionsQueueIR,
);

/** 'VerifyMention' parameters type */
export interface IVerifyMentionParams {
  id: string;
  verifiedBy: string;
}

/** 'VerifyMention' return type */
export type IVerifyMentionResult = void;

/** 'VerifyMention' query type */
export interface IVerifyMentionQuery {
  params: IVerifyMentionParams;
  result: IVerifyMentionResult;
}

const verifyMentionIR: any = {
  usedParamSet: { verifiedBy: true, id: true },
  params: [
    { name: 'verifiedBy', required: true, transform: { type: 'scalar' }, locs: [{ a: 55, b: 66 }] },
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 112, b: 115 }] },
  ],
  statement:
    'UPDATE entity_mentions\nSET verified = 1, verified_by = :verifiedBy!, verified_at = CURRENT_TIMESTAMP\nWHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * UPDATE entity_mentions
 * SET verified = 1, verified_by = :verifiedBy!, verified_at = CURRENT_TIMESTAMP
 * WHERE id = :id!
 * ```
 */
export const verifyMention = new PreparedQuery<IVerifyMentionParams, IVerifyMentionResult>(
  verifyMentionIR,
);

/** 'RejectMention' parameters type */
export interface IRejectMentionParams {
  id: string;
  reason: string;
  verifiedBy: string;
}

/** 'RejectMention' return type */
export type IRejectMentionResult = void;

/** 'RejectMention' query type */
export interface IRejectMentionQuery {
  params: IRejectMentionParams;
  result: IRejectMentionResult;
}

const rejectMentionIR: any = {
  usedParamSet: { verifiedBy: true, reason: true, id: true },
  params: [
    { name: 'verifiedBy', required: true, transform: { type: 'scalar' }, locs: [{ a: 56, b: 67 }] },
    { name: 'reason', required: true, transform: { type: 'scalar' }, locs: [{ a: 122, b: 129 }] },
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 142, b: 145 }] },
  ],
  statement:
    'UPDATE entity_mentions\nSET verified = -1, verified_by = :verifiedBy!, verified_at = CURRENT_TIMESTAMP, rejection_reason = :reason!\nWHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * UPDATE entity_mentions
 * SET verified = -1, verified_by = :verifiedBy!, verified_at = CURRENT_TIMESTAMP, rejection_reason = :reason!
 * WHERE id = :id!
 * ```
 */
export const rejectMention = new PreparedQuery<IRejectMentionParams, IRejectMentionResult>(
  rejectMentionIR,
);

/** 'GetClaimsQueue' parameters type */
export interface IGetClaimsQueueParams {
  limit: NumberOrString;
}

/** 'GetClaimsQueue' return type */
export interface IGetClaimsQueueResult {
  confidence: number | null;
  fileName: string | null;
  id: string;
  objectText: string | null;
  predicate: string | null;
  signalScore: number | null;
  subjectEntityId: string | null;
  subjectEntityName: string;
}

/** 'GetClaimsQueue' query type */
export interface IGetClaimsQueueQuery {
  params: IGetClaimsQueueParams;
  result: IGetClaimsQueueResult;
}

const getClaimsQueueIR: any = {
  usedParamSet: { limit: true },
  params: [
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 460, b: 466 }] },
  ],
  statement:
    'SELECT\n  c.id, c.subject_entity_id as "subjectEntityId", c.predicate, c.object_text as "objectText", c.confidence,\n  ds.signal_score as "signalScore", d.file_name as "fileName",\n  e.full_name as "subjectEntityName"\nFROM claim_triples c\nJOIN documents d ON c.document_id = d.id\nLEFT JOIN document_sentences ds ON c.sentence_id = ds.id\nLEFT JOIN entities e ON c.subject_entity_id = e.id\nWHERE c.verified = 0\nORDER BY ds.signal_score DESC, c.confidence ASC\nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   c.id, c.subject_entity_id as "subjectEntityId", c.predicate, c.object_text as "objectText", c.confidence,
 *   ds.signal_score as "signalScore", d.file_name as "fileName",
 *   e.full_name as "subjectEntityName"
 * FROM claim_triples c
 * JOIN documents d ON c.document_id = d.id
 * LEFT JOIN document_sentences ds ON c.sentence_id = ds.id
 * LEFT JOIN entities e ON c.subject_entity_id = e.id
 * WHERE c.verified = 0
 * ORDER BY ds.signal_score DESC, c.confidence ASC
 * LIMIT :limit!
 * ```
 */
export const getClaimsQueue = new PreparedQuery<IGetClaimsQueueParams, IGetClaimsQueueResult>(
  getClaimsQueueIR,
);

/** 'VerifyClaim' parameters type */
export interface IVerifyClaimParams {
  id: NumberOrString;
  verifiedBy: string;
}

/** 'VerifyClaim' return type */
export type IVerifyClaimResult = void;

/** 'VerifyClaim' query type */
export interface IVerifyClaimQuery {
  params: IVerifyClaimParams;
  result: IVerifyClaimResult;
}

const verifyClaimIR: any = {
  usedParamSet: { verifiedBy: true, id: true },
  params: [
    { name: 'verifiedBy', required: true, transform: { type: 'scalar' }, locs: [{ a: 53, b: 64 }] },
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 110, b: 113 }] },
  ],
  statement:
    'UPDATE claim_triples\nSET verified = 1, verified_by = :verifiedBy!, verified_at = CURRENT_TIMESTAMP\nWHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * UPDATE claim_triples
 * SET verified = 1, verified_by = :verifiedBy!, verified_at = CURRENT_TIMESTAMP
 * WHERE id = :id!
 * ```
 */
export const verifyClaim = new PreparedQuery<IVerifyClaimParams, IVerifyClaimResult>(verifyClaimIR);

/** 'RejectClaim' parameters type */
export interface IRejectClaimParams {
  id: NumberOrString;
  reason: string;
  verifiedBy: string;
}

/** 'RejectClaim' return type */
export type IRejectClaimResult = void;

/** 'RejectClaim' query type */
export interface IRejectClaimQuery {
  params: IRejectClaimParams;
  result: IRejectClaimResult;
}

const rejectClaimIR: any = {
  usedParamSet: { verifiedBy: true, reason: true, id: true },
  params: [
    { name: 'verifiedBy', required: true, transform: { type: 'scalar' }, locs: [{ a: 54, b: 65 }] },
    { name: 'reason', required: true, transform: { type: 'scalar' }, locs: [{ a: 120, b: 127 }] },
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 140, b: 143 }] },
  ],
  statement:
    'UPDATE claim_triples\nSET verified = -1, verified_by = :verifiedBy!, verified_at = CURRENT_TIMESTAMP, rejection_reason = :reason!\nWHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * UPDATE claim_triples
 * SET verified = -1, verified_by = :verifiedBy!, verified_at = CURRENT_TIMESTAMP, rejection_reason = :reason!
 * WHERE id = :id!
 * ```
 */
export const rejectClaim = new PreparedQuery<IRejectClaimParams, IRejectClaimResult>(rejectClaimIR);
