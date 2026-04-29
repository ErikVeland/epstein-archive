import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from '@client/components/common/Icon';
import s from './EntityFinancialTab.module.css';

interface Transaction {
  id: number;
  from_entity: string;
  to_entity: string;
  amount: number;
  currency: string;
  transaction_date: string;
  transaction_type: string;
  method: string;
  risk_level: string;
  description: string;
  source_document_id: string | null;
}

interface EntityFinancialTabProps {
  entityId: string;
  entityName?: string;
}

export const EntityFinancialTab: React.FC<EntityFinancialTabProps> = ({ entityId, entityName }) => {
  const { data, isLoading, isError } = useQuery<{
    transactions: Transaction[];
    entityName: string;
  }>({
    queryKey: ['entity-transactions', entityId],
    queryFn: async () => {
      const res = await fetch(`/api/entities/${entityId}/transactions`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json() as Promise<{ transactions: Transaction[]; entityName: string }>;
    },
    enabled: !!entityId,
    staleTime: 60_000,
  });

  const transactions = data?.transactions ?? [];
  const resolvedName = data?.entityName ?? entityName ?? '';

  const formatCurrency = (amount: number, currency: string): string =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateStr: string): string =>
    new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const getRiskClass = (risk: string): string => {
    if (risk === 'high' || risk === 'critical') return s.riskHigh;
    if (risk === 'medium') return s.riskMedium;
    return s.riskLow;
  };

  return (
    <div className={s.tabContainer} data-testid="entity-modal-tab-financial">
      <div className={s.header}>
        <h3 className={s.headerTitle}>
          <Icon name="DollarSign" size="sm" className={s.financialIcon} />
          Financial Transactions
        </h3>
        <div className={s.countBadge}>
          {isLoading
            ? 'Loading…'
            : `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      <div className={s.listContainer}>
        {isLoading && (
          <div className={s.skeletonStack}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={s.skeletonCard} />
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <div className={s.emptyState}>
            <Icon name="DollarSign" size="xl" className={s.emptyIcon} />
            <h4 className={s.emptyTitle}>Financial records could not be loaded</h4>
            <p className={s.emptyText}>The financial endpoint returned an error.</p>
          </div>
        )}

        {!isLoading && !isError && transactions.length === 0 && (
          <div className={s.emptyState}>
            <Icon name="DollarSign" size="xl" className={s.emptyIcon} />
            <h4 className={s.emptyTitle}>No Financial Records</h4>
            <p className={s.emptyText}>
              No transactions are linked to {resolvedName || 'this entity'} in the financial corpus.
            </p>
          </div>
        )}

        {!isLoading &&
          !isError &&
          transactions.map((tx) => {
            const isIncoming = tx.to_entity.toLowerCase() === resolvedName.toLowerCase();
            const counterparty = isIncoming ? tx.from_entity : tx.to_entity;

            return (
              <div key={tx.id} className={s.card}>
                <div className={s.cardTop}>
                  <div className={s.direction}>
                    <span className={`${s.directionLabel} ${isIncoming ? s.incoming : s.outgoing}`}>
                      {isIncoming ? (
                        <Icon name="ArrowDownLeft" size="xs" />
                      ) : (
                        <Icon name="ArrowUpRight" size="xs" />
                      )}
                      {isIncoming ? ' In' : ' Out'}
                    </span>
                    <span className={s.entityName}>{counterparty}</span>
                  </div>
                  <span className={s.amount}>{formatCurrency(tx.amount, tx.currency)}</span>
                </div>

                <div className={s.meta}>
                  <span className={s.metaChip}>{formatDate(tx.transaction_date)}</span>
                  <span className={s.metaChip}>{tx.transaction_type}</span>
                  <span className={s.metaChip}>{tx.method}</span>
                  <span className={`${s.metaChip} ${getRiskClass(tx.risk_level)}`}>
                    {tx.risk_level} risk
                  </span>
                </div>

                {tx.description && <p className={s.description}>{tx.description}</p>}

                {tx.source_document_id && (
                  <a
                    href={`/documents?id=${encodeURIComponent(tx.source_document_id)}`}
                    className={s.sourceLink}
                  >
                    <Icon name="FileText" size="xs" /> View Source Document
                  </a>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};
