export interface FinancialTransactionDto {
  id: string;
  fromEntityId: number | null;
  toEntityId: number | null;
  fromEntityName: string | null;
  toEntityName: string | null;
  amount: number;
  currency: string;
  date: string;
  description: string | null;
  transactionType: string | null;
  riskRating: number | null;
}

export interface FinancialSummaryDto {
  totalVolume: number;
  transactionCount: number;
  highRiskCount: number;
  topEntities: Array<{ id: number; name: string; volume: number }>;
}
