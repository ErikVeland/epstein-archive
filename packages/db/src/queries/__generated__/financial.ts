/** Types generated for queries found in "src/queries/financial.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type NumberOrString = number | string;

/** 'GetTransactions' parameters type */
export interface IGetTransactionsParams {
  limit: NumberOrString;
}

/** 'GetTransactions' return type */
export interface IGetTransactionsResult {
  amount: string;
  created_at: Date | null;
  currency: string | null;
  description: string | null;
  from_entity: string;
  id: string;
  investigation_id: string | null;
  metadata_json: Json | null;
  method: string;
  risk_level: string | null;
  source_document_id: string | null;
  to_entity: string;
  transaction_date: Date;
  transaction_type: string;
}

/** 'GetTransactions' query type */
export interface IGetTransactionsQuery {
  params: IGetTransactionsParams;
  result: IGetTransactionsResult;
}

const getTransactionsIR: any = {
  usedParamSet: { limit: true },
  params: [
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 281, b: 287 }] },
  ],
  statement:
    'SELECT\n  id,\n  from_entity,\n  to_entity,\n  amount,\n  currency,\n  transaction_date,\n  transaction_type,\n  method,\n  risk_level,\n  description,\n  investigation_id,\n  source_document_id,\n  metadata_json,\n  created_at\nFROM financial_transactions \nORDER BY transaction_date DESC \nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   id,
 *   from_entity,
 *   to_entity,
 *   amount,
 *   currency,
 *   transaction_date,
 *   transaction_type,
 *   method,
 *   risk_level,
 *   description,
 *   investigation_id,
 *   source_document_id,
 *   metadata_json,
 *   created_at
 * FROM financial_transactions
 * ORDER BY transaction_date DESC
 * LIMIT :limit!
 * ```
 */
export const getTransactions = new PreparedQuery<IGetTransactionsParams, IGetTransactionsResult>(
  getTransactionsIR,
);

/** 'GetTransactionsByInvestigation' parameters type */
export interface IGetTransactionsByInvestigationParams {
  investigationId: NumberOrString;
}

/** 'GetTransactionsByInvestigation' return type */
export interface IGetTransactionsByInvestigationResult {
  amount: string;
  created_at: Date | null;
  currency: string | null;
  description: string | null;
  from_entity: string;
  id: string;
  investigation_id: string | null;
  metadata_json: Json | null;
  method: string;
  risk_level: string | null;
  source_document_id: string | null;
  to_entity: string;
  transaction_date: Date;
  transaction_type: string;
}

/** 'GetTransactionsByInvestigation' query type */
export interface IGetTransactionsByInvestigationQuery {
  params: IGetTransactionsByInvestigationParams;
  result: IGetTransactionsByInvestigationResult;
}

const getTransactionsByInvestigationIR: any = {
  usedParamSet: { investigationId: true },
  params: [
    {
      name: 'investigationId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 268, b: 284 }],
    },
  ],
  statement:
    'SELECT\n  id,\n  from_entity,\n  to_entity,\n  amount,\n  currency,\n  transaction_date,\n  transaction_type,\n  method,\n  risk_level,\n  description,\n  investigation_id,\n  source_document_id,\n  metadata_json,\n  created_at\nFROM financial_transactions \nWHERE investigation_id = :investigationId!::bigint\nORDER BY transaction_date DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   id,
 *   from_entity,
 *   to_entity,
 *   amount,
 *   currency,
 *   transaction_date,
 *   transaction_type,
 *   method,
 *   risk_level,
 *   description,
 *   investigation_id,
 *   source_document_id,
 *   metadata_json,
 *   created_at
 * FROM financial_transactions
 * WHERE investigation_id = :investigationId!::bigint
 * ORDER BY transaction_date DESC
 * ```
 */
export const getTransactionsByInvestigation = new PreparedQuery<
  IGetTransactionsByInvestigationParams,
  IGetTransactionsByInvestigationResult
>(getTransactionsByInvestigationIR);

/** 'GetTransactionsByEntity' parameters type */
export interface IGetTransactionsByEntityParams {
  entityName: string;
}

/** 'GetTransactionsByEntity' return type */
export interface IGetTransactionsByEntityResult {
  amount: string;
  created_at: Date | null;
  currency: string | null;
  description: string | null;
  from_entity: string;
  id: string;
  investigation_id: string | null;
  metadata_json: Json | null;
  method: string;
  risk_level: string | null;
  source_document_id: string | null;
  to_entity: string;
  transaction_date: Date;
  transaction_type: string;
}

/** 'GetTransactionsByEntity' query type */
export interface IGetTransactionsByEntityQuery {
  params: IGetTransactionsByEntityParams;
  result: IGetTransactionsByEntityResult;
}

const getTransactionsByEntityIR: any = {
  usedParamSet: { entityName: true },
  params: [
    {
      name: 'entityName',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 263, b: 274 },
        { a: 291, b: 302 },
      ],
    },
  ],
  statement:
    'SELECT\n  id,\n  from_entity,\n  to_entity,\n  amount,\n  currency,\n  transaction_date,\n  transaction_type,\n  method,\n  risk_level,\n  description,\n  investigation_id,\n  source_document_id,\n  metadata_json,\n  created_at\nFROM financial_transactions \nWHERE from_entity = :entityName! OR to_entity = :entityName!\nORDER BY transaction_date DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   id,
 *   from_entity,
 *   to_entity,
 *   amount,
 *   currency,
 *   transaction_date,
 *   transaction_type,
 *   method,
 *   risk_level,
 *   description,
 *   investigation_id,
 *   source_document_id,
 *   metadata_json,
 *   created_at
 * FROM financial_transactions
 * WHERE from_entity = :entityName! OR to_entity = :entityName!
 * ORDER BY transaction_date DESC
 * ```
 */
export const getTransactionsByEntity = new PreparedQuery<
  IGetTransactionsByEntityParams,
  IGetTransactionsByEntityResult
>(getTransactionsByEntityIR);

/** 'SaveTransaction' parameters type */
export interface ISaveTransactionParams {
  amount: NumberOrString;
  currency: string;
  description: string;
  fromEntity: string;
  investigationId?: NumberOrString | null | void;
  metadataJson?: Json | null | void;
  method: string;
  riskLevel: string;
  sourceDocumentId?: NumberOrString | null | void;
  toEntity: string;
  transactionDate: DateOrString;
  transactionType: string;
}

/** 'SaveTransaction' return type */
export interface ISaveTransactionResult {
  id: string;
}

/** 'SaveTransaction' query type */
export interface ISaveTransactionQuery {
  params: ISaveTransactionParams;
  result: ISaveTransactionResult;
}

const saveTransactionIR: any = {
  usedParamSet: {
    fromEntity: true,
    toEntity: true,
    amount: true,
    currency: true,
    transactionDate: true,
    transactionType: true,
    method: true,
    riskLevel: true,
    description: true,
    investigationId: true,
    sourceDocumentId: true,
    metadataJson: true,
  },
  params: [
    {
      name: 'fromEntity',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 221, b: 232 }],
    },
    { name: 'toEntity', required: true, transform: { type: 'scalar' }, locs: [{ a: 235, b: 244 }] },
    { name: 'amount', required: true, transform: { type: 'scalar' }, locs: [{ a: 247, b: 254 }] },
    { name: 'currency', required: true, transform: { type: 'scalar' }, locs: [{ a: 257, b: 266 }] },
    {
      name: 'transactionDate',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 269, b: 285 }],
    },
    {
      name: 'transactionType',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 290, b: 306 }],
    },
    { name: 'method', required: true, transform: { type: 'scalar' }, locs: [{ a: 309, b: 316 }] },
    {
      name: 'riskLevel',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 319, b: 329 }],
    },
    {
      name: 'description',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 332, b: 344 }],
    },
    {
      name: 'investigationId',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 349, b: 364 }],
    },
    {
      name: 'sourceDocumentId',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 367, b: 383 }],
    },
    {
      name: 'metadataJson',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 386, b: 398 }],
    },
  ],
  statement:
    'INSERT INTO financial_transactions (\n  from_entity, to_entity, amount, currency, transaction_date, \n  transaction_type, method, risk_level, description, \n  investigation_id, source_document_id, metadata_json\n) VALUES (\n  :fromEntity!, :toEntity!, :amount!, :currency!, :transactionDate!,\n  :transactionType!, :method!, :riskLevel!, :description!,\n  :investigationId, :sourceDocumentId, :metadataJson\n)\nRETURNING id',
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO financial_transactions (
 *   from_entity, to_entity, amount, currency, transaction_date,
 *   transaction_type, method, risk_level, description,
 *   investigation_id, source_document_id, metadata_json
 * ) VALUES (
 *   :fromEntity!, :toEntity!, :amount!, :currency!, :transactionDate!,
 *   :transactionType!, :method!, :riskLevel!, :description!,
 *   :investigationId, :sourceDocumentId, :metadataJson
 * )
 * RETURNING id
 * ```
 */
export const saveTransaction = new PreparedQuery<ISaveTransactionParams, ISaveTransactionResult>(
  saveTransactionIR,
);

/** 'GetFinancialSummary' parameters type */
export type IGetFinancialSummaryParams = void;

/** 'GetFinancialSummary' return type */
export interface IGetFinancialSummaryResult {
  highRiskCount: number | null;
  totalTransactions: number | null;
  totalValue: string | null;
}

/** 'GetFinancialSummary' query type */
export interface IGetFinancialSummaryQuery {
  params: IGetFinancialSummaryParams;
  result: IGetFinancialSummaryResult;
}

const getFinancialSummaryIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'SELECT\n  (SELECT SUM(amount) FROM financial_transactions) as "totalValue",\n  (SELECT COUNT(*)::integer FROM financial_transactions WHERE risk_level IN (\'high\', \'critical\')) as "highRiskCount",\n  (SELECT COUNT(*)::integer FROM financial_transactions) as "totalTransactions"',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   (SELECT SUM(amount) FROM financial_transactions) as "totalValue",
 *   (SELECT COUNT(*)::integer FROM financial_transactions WHERE risk_level IN ('high', 'critical')) as "highRiskCount",
 *   (SELECT COUNT(*)::integer FROM financial_transactions) as "totalTransactions"
 * ```
 */
export const getFinancialSummary = new PreparedQuery<
  IGetFinancialSummaryParams,
  IGetFinancialSummaryResult
>(getFinancialSummaryIR);

/** 'GetTopFinancialEntities' parameters type */
export interface IGetTopFinancialEntitiesParams {
  limit: NumberOrString;
}

/** 'GetTopFinancialEntities' return type */
export interface IGetTopFinancialEntitiesResult {
  entity: string | null;
  totalVolume: string | null;
}

/** 'GetTopFinancialEntities' query type */
export interface IGetTopFinancialEntitiesQuery {
  params: IGetTopFinancialEntitiesParams;
  result: IGetTopFinancialEntitiesResult;
}

const getTopFinancialEntitiesIR: any = {
  usedParamSet: { limit: true },
  params: [
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 252, b: 258 }] },
  ],
  statement:
    'SELECT entity, SUM(amount) as "totalVolume" FROM (\n  SELECT from_entity as entity, amount FROM financial_transactions\n  UNION ALL\n  SELECT to_entity as entity, amount FROM financial_transactions\n) t \nGROUP BY entity \nORDER BY "totalVolume" DESC \nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT entity, SUM(amount) as "totalVolume" FROM (
 *   SELECT from_entity as entity, amount FROM financial_transactions
 *   UNION ALL
 *   SELECT to_entity as entity, amount FROM financial_transactions
 * ) t
 * GROUP BY entity
 * ORDER BY "totalVolume" DESC
 * LIMIT :limit!
 * ```
 */
export const getTopFinancialEntities = new PreparedQuery<
  IGetTopFinancialEntitiesParams,
  IGetTopFinancialEntitiesResult
>(getTopFinancialEntitiesIR);
