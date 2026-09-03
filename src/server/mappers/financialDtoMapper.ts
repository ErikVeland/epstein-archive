import type { FinancialTransactionDto, FinancialSummaryDto } from '@shared/dto/financial';

interface TransactionRowInput {
  id?: unknown;
  from_entity_id?: unknown;
  to_entity_id?: unknown;
  from_entity_name?: unknown;
  from_entity?: unknown;
  to_entity_name?: unknown;
  to_entity?: unknown;
  amount?: unknown;
  currency?: unknown;
  date?: unknown;
  transaction_date?: unknown;
  description?: unknown;
  transaction_type?: unknown;
  type?: unknown;
  risk_rating?: unknown;
  source_document_id?: unknown;
  method?: unknown;
}

interface SummaryRowInput {
  totalVolume?: unknown;
  total_volume?: unknown;
  transactionCount?: unknown;
  transaction_count?: unknown;
  highRiskCount?: unknown;
  high_risk_count?: unknown;
  topEntities?: { id?: unknown; name?: unknown; volume?: unknown }[];
  top_entities?: { id?: unknown; name?: unknown; volume?: unknown }[];
}

const asNullableString = (value: unknown): string | null => {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint')
    return String(value);
  return null;
};

export const mapFinancialTransactionDto = (row: TransactionRowInput): FinancialTransactionDto => ({
  id: String(row.id || ''),
  fromEntityId: row.from_entity_id ? Number(row.from_entity_id) : null,
  toEntityId: row.to_entity_id ? Number(row.to_entity_id) : null,
  fromEntityName: asNullableString(row.from_entity_name ?? row.from_entity),
  toEntityName: asNullableString(row.to_entity_name ?? row.to_entity),
  amount: Number(row.amount || 0),
  currency: String(row.currency || ''),
  date: String(row.transaction_date ?? row.date ?? ''),
  description: asNullableString(row.description),
  transactionType: asNullableString(row.transaction_type ?? row.type),
  riskRating: row.risk_rating != null ? Number(row.risk_rating) : null,
  sourceDocumentId: asNullableString(row.source_document_id),
  method: asNullableString(row.method),
});

export const mapFinancialSummaryDto = (data: SummaryRowInput): FinancialSummaryDto => ({
  totalVolume: Number(data.totalVolume ?? data.total_volume ?? 0),
  transactionCount: Number(data.transactionCount ?? data.transaction_count ?? 0),
  highRiskCount: Number(data.highRiskCount ?? data.high_risk_count ?? 0),
  topEntities: (() => {
    const raw = data.topEntities ?? data.top_entities;
    return Array.isArray(raw)
      ? (raw as Record<string, unknown>[]).map((e) => ({
          id: Number(e.id || 0),
          name: String(e.name || ''),
          volume: Number(e.volume || 0),
        }))
      : [];
  })(),
});
