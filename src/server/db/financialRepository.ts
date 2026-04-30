import { financialQueries } from '@epstein/db';
import {
  IGetTransactionsResult,
  IGetTransactionsByInvestigationResult,
  IGetTransactionsByEntityResult,
  IGetTopFinancialEntitiesResult,
} from '@epstein/db/src/queries/__generated__/financial.js';
import { getApiPool } from './connection.js';

export interface FinancialTransaction {
  id?: number;
  from_entity: string;
  to_entity: string;
  amount: number;
  currency: string;
  transaction_date: string;
  transaction_type: string;
  method: string;
  risk_level: string;
  description: string;
  investigation_id?: number;
  source_document_id?: string;
  metadata_json?: string;
  created_at?: string;
}

export const financialRepository = {
  getTransactions: async (limit: number = 100): Promise<FinancialTransaction[]> => {
    const rows = await financialQueries.getTransactions.run({ limit }, getApiPool());
    return rows.map((r: IGetTransactionsResult) => ({
      id: Number(r.id),
      from_entity: r.from_entity,
      to_entity: r.to_entity,
      amount: Number(r.amount),
      currency: r.currency || 'USD',
      transaction_date:
        r.transaction_date instanceof Date
          ? r.transaction_date.toISOString()
          : String(r.transaction_date),
      transaction_type: r.transaction_type,
      method: r.method,
      risk_level: r.risk_level || 'medium',
      description: r.description || '',
      investigation_id: r.investigation_id ? Number(r.investigation_id) : undefined,
      source_document_id: r.source_document_id || undefined,
      metadata_json: r.metadata_json ? JSON.stringify(r.metadata_json) : undefined,
      created_at: r.created_at ? r.created_at.toISOString() : undefined,
    })) as FinancialTransaction[];
  },

  getTransactionsByInvestigation: async (
    investigationId: number,
  ): Promise<FinancialTransaction[]> => {
    const rows = await financialQueries.getTransactionsByInvestigation.run(
      { investigationId },
      getApiPool(),
    );
    return rows.map((r: IGetTransactionsByInvestigationResult) => ({
      id: Number(r.id),
      from_entity: r.from_entity,
      to_entity: r.to_entity,
      amount: Number(r.amount),
      currency: r.currency || 'USD',
      transaction_date:
        r.transaction_date instanceof Date
          ? r.transaction_date.toISOString()
          : String(r.transaction_date),
      transaction_type: r.transaction_type,
      method: r.method,
      risk_level: r.risk_level || 'medium',
      description: r.description || '',
      investigation_id: r.investigation_id ? Number(r.investigation_id) : undefined,
      source_document_id: r.source_document_id || undefined,
      metadata_json: r.metadata_json ? JSON.stringify(r.metadata_json) : undefined,
      created_at: r.created_at ? r.created_at.toISOString() : undefined,
    })) as FinancialTransaction[];
  },

  getTransactionsByEntity: async (entityName: string): Promise<FinancialTransaction[]> => {
    const rows = await financialQueries.getTransactionsByEntity.run({ entityName }, getApiPool());
    return rows.map((r: IGetTransactionsByEntityResult) => ({
      id: Number(r.id),
      from_entity: r.from_entity,
      to_entity: r.to_entity,
      amount: Number(r.amount),
      currency: r.currency || 'USD',
      transaction_date:
        r.transaction_date instanceof Date
          ? r.transaction_date.toISOString()
          : String(r.transaction_date),
      transaction_type: r.transaction_type,
      method: r.method,
      risk_level: r.risk_level || 'medium',
      description: r.description || '',
      investigation_id: r.investigation_id ? Number(r.investigation_id) : undefined,
      source_document_id: r.source_document_id || undefined,
      metadata_json: r.metadata_json ? JSON.stringify(r.metadata_json) : undefined,
      created_at: r.created_at ? r.created_at.toISOString() : undefined,
    })) as FinancialTransaction[];
  },

  saveTransaction: async (tx: FinancialTransaction) => {
    const result = await financialQueries.saveTransaction.run(
      {
        fromEntity: tx.from_entity,
        toEntity: tx.to_entity,
        amount: String(tx.amount), // decimal/numeric in Postgres often comes as string in results but takes string or number in run? Actually decimal is string.
        currency: tx.currency || 'USD',
        transactionDate: tx.transaction_date,
        transactionType: tx.transaction_type,
        method: tx.method,
        riskLevel: tx.risk_level || 'medium',
        description: tx.description,
        investigationId: tx.investigation_id || null,
        sourceDocumentId: tx.source_document_id || null,
        metadataJson: tx.metadata_json || null,
      },
      getApiPool(),
    );

    return result[0]?.id ? Number(result[0].id) : null;
  },

  getFinancialSummary: async () => {
    const [summary] = await financialQueries.getFinancialSummary.run(undefined, getApiPool());
    const topEntities = await financialQueries.getTopFinancialEntities.run(
      { limit: 5 },
      getApiPool(),
    );

    return {
      totalValue: Number(summary?.totalValue || 0),
      highRiskCount: Number(summary?.highRiskCount || 0),
      totalTransactions: Number(summary?.totalTransactions || 0),
      topEntities: topEntities.map((e: IGetTopFinancialEntitiesResult) => ({
        name: e.entity,
        totalAmount: Number(e.totalVolume || 0),
      })),
    };
  },
};
