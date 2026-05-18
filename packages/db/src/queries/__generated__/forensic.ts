/** Types generated for queries found in "src/queries/forensic.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type NumberOrString = number | string;

export type stringArray = string[];

/** 'GetForensicSignals' parameters type */
export interface IGetForensicSignalsParams {
  limit: NumberOrString;
  offset: NumberOrString;
  status?: string | null | void;
  type?: string | null | void;
}

/** 'GetForensicSignals' return type */
export interface IGetForensicSignalsResult {
  confidence: number;
  created_at: Date | null;
  entities: Json | null;
  entity_ids: stringArray;
  evidence: Json | null;
  id: string;
  metadata_json: Json | null;
  risk_score: number;
  signal_type: string;
  source_ref_id: string;
  source_type: string;
  status: string | null;
  updated_at: Date | null;
}

/** 'GetForensicSignals' query type */
export interface IGetForensicSignalsQuery {
  params: IGetForensicSignalsParams;
  result: IGetForensicSignalsResult;
}

const getForensicSignalsIR: any = {
  usedParamSet: { status: true, type: true, limit: true, offset: true },
  params: [
    {
      name: 'status',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 740, b: 746 },
        { a: 776, b: 782 },
      ],
    },
    {
      name: 'type',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 792, b: 796 },
        { a: 831, b: 835 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 871, b: 877 }] },
    { name: 'offset', required: true, transform: { type: 'scalar' }, locs: [{ a: 886, b: 893 }] },
  ],
  statement:
    "SELECT\n       s.id,\n       s.signal_type,\n       s.confidence,\n       s.risk_score,\n       s.source_type,\n       s.source_ref_id,\n       s.entity_ids,\n       s.metadata_json,\n       s.status,\n       s.created_at,\n       s.updated_at,\n       (SELECT json_agg(json_build_object('id', e.id, 'name', e.full_name, 'role', se.role))\n        FROM forensic_signal_entities se\n        JOIN entities e ON se.entity_id = e.id\n        WHERE se.signal_id = s.id) as entities,\n       (SELECT json_agg(json_build_object('id', d.id, 'file_name', d.file_name, 'snippet', sev.snippet))\n        FROM forensic_signal_evidence sev\n        JOIN documents d ON sev.document_id = d.id\n        WHERE sev.signal_id = s.id) as evidence\nFROM forensic_signals s\nWHERE (:status::text IS NULL OR s.status = :status)\n  AND (:type::text IS NULL OR s.signal_type = :type)\nORDER BY s.created_at DESC\nLIMIT :limit! OFFSET :offset!",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *        s.id,
 *        s.signal_type,
 *        s.confidence,
 *        s.risk_score,
 *        s.source_type,
 *        s.source_ref_id,
 *        s.entity_ids,
 *        s.metadata_json,
 *        s.status,
 *        s.created_at,
 *        s.updated_at,
 *        (SELECT json_agg(json_build_object('id', e.id, 'name', e.full_name, 'role', se.role))
 *         FROM forensic_signal_entities se
 *         JOIN entities e ON se.entity_id = e.id
 *         WHERE se.signal_id = s.id) as entities,
 *        (SELECT json_agg(json_build_object('id', d.id, 'file_name', d.file_name, 'snippet', sev.snippet))
 *         FROM forensic_signal_evidence sev
 *         JOIN documents d ON sev.document_id = d.id
 *         WHERE sev.signal_id = s.id) as evidence
 * FROM forensic_signals s
 * WHERE (:status::text IS NULL OR s.status = :status)
 *   AND (:type::text IS NULL OR s.signal_type = :type)
 * ORDER BY s.created_at DESC
 * LIMIT :limit! OFFSET :offset!
 * ```
 */
export const getForensicSignals = new PreparedQuery<
  IGetForensicSignalsParams,
  IGetForensicSignalsResult
>(getForensicSignalsIR);

/** 'GetForensicSignalById' parameters type */
export interface IGetForensicSignalByIdParams {
  id: string;
}

/** 'GetForensicSignalById' return type */
export interface IGetForensicSignalByIdResult {
  confidence: number;
  created_at: Date | null;
  entities: Json | null;
  entity_ids: stringArray;
  evidence: Json | null;
  id: string;
  metadata_json: Json | null;
  risk_score: number;
  signal_type: string;
  source_ref_id: string;
  source_type: string;
  status: string | null;
  updated_at: Date | null;
}

/** 'GetForensicSignalById' query type */
export interface IGetForensicSignalByIdQuery {
  params: IGetForensicSignalByIdParams;
  result: IGetForensicSignalByIdResult;
}

const getForensicSignalByIdIR: any = {
  usedParamSet: { id: true },
  params: [
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 746, b: 749 }] },
  ],
  statement:
    "SELECT\n       s.id,\n       s.signal_type,\n       s.confidence,\n       s.risk_score,\n       s.source_type,\n       s.source_ref_id,\n       s.entity_ids,\n       s.metadata_json,\n       s.status,\n       s.created_at,\n       s.updated_at,\n       (SELECT json_agg(json_build_object('id', e.id, 'name', e.full_name, 'role', se.role))\n        FROM forensic_signal_entities se\n        JOIN entities e ON se.entity_id = e.id\n        WHERE se.signal_id = s.id) as entities,\n       (SELECT json_agg(json_build_object('id', d.id, 'file_name', d.file_name, 'snippet', sev.snippet))\n        FROM forensic_signal_evidence sev\n        JOIN documents d ON sev.document_id = d.id\n        WHERE sev.signal_id = s.id) as evidence\nFROM forensic_signals s\nWHERE s.id = :id!",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *        s.id,
 *        s.signal_type,
 *        s.confidence,
 *        s.risk_score,
 *        s.source_type,
 *        s.source_ref_id,
 *        s.entity_ids,
 *        s.metadata_json,
 *        s.status,
 *        s.created_at,
 *        s.updated_at,
 *        (SELECT json_agg(json_build_object('id', e.id, 'name', e.full_name, 'role', se.role))
 *         FROM forensic_signal_entities se
 *         JOIN entities e ON se.entity_id = e.id
 *         WHERE se.signal_id = s.id) as entities,
 *        (SELECT json_agg(json_build_object('id', d.id, 'file_name', d.file_name, 'snippet', sev.snippet))
 *         FROM forensic_signal_evidence sev
 *         JOIN documents d ON sev.document_id = d.id
 *         WHERE sev.signal_id = s.id) as evidence
 * FROM forensic_signals s
 * WHERE s.id = :id!
 * ```
 */
export const getForensicSignalById = new PreparedQuery<
  IGetForensicSignalByIdParams,
  IGetForensicSignalByIdResult
>(getForensicSignalByIdIR);

/** 'CreateForensicSignal' parameters type */
export interface ICreateForensicSignalParams {
  confidence?: number | null | void;
  metadata?: Json | null | void;
  riskScore?: number | null | void;
  signalType: string;
  status?: string | null | void;
}

/** 'CreateForensicSignal' return type */
export interface ICreateForensicSignalResult {
  id: string;
}

/** 'CreateForensicSignal' query type */
export interface ICreateForensicSignalQuery {
  params: ICreateForensicSignalParams;
  result: ICreateForensicSignalResult;
}

const createForensicSignalIR: any = {
  usedParamSet: {
    signalType: true,
    confidence: true,
    riskScore: true,
    status: true,
    metadata: true,
  },
  params: [
    {
      name: 'signalType',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 98, b: 109 }],
    },
    {
      name: 'confidence',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 112, b: 122 }],
    },
    {
      name: 'riskScore',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 125, b: 134 }],
    },
    { name: 'status', required: false, transform: { type: 'scalar' }, locs: [{ a: 137, b: 143 }] },
    {
      name: 'metadata',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 146, b: 154 }],
    },
  ],
  statement:
    'INSERT INTO forensic_signals (signal_type, confidence, risk_score, status, metadata_json)\nVALUES (:signalType!, :confidence, :riskScore, :status, :metadata)\nRETURNING id',
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO forensic_signals (signal_type, confidence, risk_score, status, metadata_json)
 * VALUES (:signalType!, :confidence, :riskScore, :status, :metadata)
 * RETURNING id
 * ```
 */
export const createForensicSignal = new PreparedQuery<
  ICreateForensicSignalParams,
  ICreateForensicSignalResult
>(createForensicSignalIR);

/** 'AddEntityToSignal' parameters type */
export interface IAddEntityToSignalParams {
  entityId: NumberOrString;
  role?: string | null | void;
  signalId: string;
}

/** 'AddEntityToSignal' return type */
export type IAddEntityToSignalResult = void;

/** 'AddEntityToSignal' query type */
export interface IAddEntityToSignalQuery {
  params: IAddEntityToSignalParams;
  result: IAddEntityToSignalResult;
}

const addEntityToSignalIR: any = {
  usedParamSet: { signalId: true, entityId: true, role: true },
  params: [
    { name: 'signalId', required: true, transform: { type: 'scalar' }, locs: [{ a: 74, b: 83 }] },
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 86, b: 95 }] },
    { name: 'role', required: false, transform: { type: 'scalar' }, locs: [{ a: 98, b: 102 }] },
  ],
  statement:
    'INSERT INTO forensic_signal_entities (signal_id, entity_id, role)\nVALUES (:signalId!, :entityId!, :role)\nON CONFLICT (signal_id, entity_id) DO UPDATE SET\n  role = EXCLUDED.role',
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO forensic_signal_entities (signal_id, entity_id, role)
 * VALUES (:signalId!, :entityId!, :role)
 * ON CONFLICT (signal_id, entity_id) DO UPDATE SET
 *   role = EXCLUDED.role
 * ```
 */
export const addEntityToSignal = new PreparedQuery<
  IAddEntityToSignalParams,
  IAddEntityToSignalResult
>(addEntityToSignalIR);

/** 'AddEvidenceToSignal' parameters type */
export interface IAddEvidenceToSignalParams {
  documentId: NumberOrString;
  signalId: string;
  snippet?: string | null | void;
}

/** 'AddEvidenceToSignal' return type */
export type IAddEvidenceToSignalResult = void;

/** 'AddEvidenceToSignal' query type */
export interface IAddEvidenceToSignalQuery {
  params: IAddEvidenceToSignalParams;
  result: IAddEvidenceToSignalResult;
}

const addEvidenceToSignalIR: any = {
  usedParamSet: { signalId: true, documentId: true, snippet: true },
  params: [
    { name: 'signalId', required: true, transform: { type: 'scalar' }, locs: [{ a: 79, b: 88 }] },
    {
      name: 'documentId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 91, b: 102 }],
    },
    { name: 'snippet', required: false, transform: { type: 'scalar' }, locs: [{ a: 105, b: 112 }] },
  ],
  statement:
    'INSERT INTO forensic_signal_evidence (signal_id, document_id, snippet)\nVALUES (:signalId!, :documentId!, :snippet)\nON CONFLICT (signal_id, document_id) DO UPDATE SET\n  snippet = EXCLUDED.snippet',
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO forensic_signal_evidence (signal_id, document_id, snippet)
 * VALUES (:signalId!, :documentId!, :snippet)
 * ON CONFLICT (signal_id, document_id) DO UPDATE SET
 *   snippet = EXCLUDED.snippet
 * ```
 */
export const addEvidenceToSignal = new PreparedQuery<
  IAddEvidenceToSignalParams,
  IAddEvidenceToSignalResult
>(addEvidenceToSignalIR);

/** 'UpdateSignalStatus' parameters type */
export interface IUpdateSignalStatusParams {
  id: string;
  status: string;
}

/** 'UpdateSignalStatus' return type */
export type IUpdateSignalStatusResult = void;

/** 'UpdateSignalStatus' query type */
export interface IUpdateSignalStatusQuery {
  params: IUpdateSignalStatusParams;
  result: IUpdateSignalStatusResult;
}

const updateSignalStatusIR: any = {
  usedParamSet: { status: true, id: true },
  params: [
    { name: 'status', required: true, transform: { type: 'scalar' }, locs: [{ a: 40, b: 47 }] },
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 94, b: 97 }] },
  ],
  statement:
    'UPDATE forensic_signals\nSET \n  status = :status!,\n  updated_at = CURRENT_TIMESTAMP\nWHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * UPDATE forensic_signals
 * SET
 *   status = :status!,
 *   updated_at = CURRENT_TIMESTAMP
 * WHERE id = :id!
 * ```
 */
export const updateSignalStatus = new PreparedQuery<
  IUpdateSignalStatusParams,
  IUpdateSignalStatusResult
>(updateSignalStatusIR);

/** 'GetSignalsByEntityId' parameters type */
export interface IGetSignalsByEntityIdParams {
  entityId: NumberOrString;
}

/** 'GetSignalsByEntityId' return type */
export interface IGetSignalsByEntityIdResult {
  confidence: number;
  created_at: Date | null;
  entity_ids: stringArray;
  id: string;
  metadata_json: Json | null;
  risk_score: number;
  signal_type: string;
  source_ref_id: string;
  source_type: string;
  status: string | null;
  updated_at: Date | null;
}

/** 'GetSignalsByEntityId' query type */
export interface IGetSignalsByEntityIdQuery {
  params: IGetSignalsByEntityIdParams;
  result: IGetSignalsByEntityIdResult;
}

const getSignalsByEntityIdIR: any = {
  usedParamSet: { entityId: true },
  params: [
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 279, b: 288 }] },
  ],
  statement:
    'SELECT\n  s.id,\n  s.signal_type,\n  s.confidence,\n  s.risk_score,\n  s.source_type,\n  s.source_ref_id,\n  s.entity_ids,\n  s.metadata_json,\n  s.status,\n  s.created_at,\n  s.updated_at\nFROM forensic_signals s\nJOIN forensic_signal_entities se ON s.id = se.signal_id\nWHERE se.entity_id = :entityId!\nORDER BY s.created_at DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   s.id,
 *   s.signal_type,
 *   s.confidence,
 *   s.risk_score,
 *   s.source_type,
 *   s.source_ref_id,
 *   s.entity_ids,
 *   s.metadata_json,
 *   s.status,
 *   s.created_at,
 *   s.updated_at
 * FROM forensic_signals s
 * JOIN forensic_signal_entities se ON s.id = se.signal_id
 * WHERE se.entity_id = :entityId!
 * ORDER BY s.created_at DESC
 * ```
 */
export const getSignalsByEntityId = new PreparedQuery<
  IGetSignalsByEntityIdParams,
  IGetSignalsByEntityIdResult
>(getSignalsByEntityIdIR);
