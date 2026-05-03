import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { SEO } from '@client/components/common/SEO';
import Icon from '@client/components/common/Icon';
import { ShareCitationBar } from '@client/components/common/ShareCitationBar';
import { Surface } from '@client/design-system/lib';
import styles from './SharedDetailPage.module.css';

interface FinancialDetail {
  id: string;
  fromEntityName: string | null;
  toEntityName: string | null;
  amount: number;
  currency: string;
  date: string;
  description: string | null;
  transactionType: string | null;
  riskRating: number | null;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function FinancialTransactionDetailPage() {
  const { id = '' } = useParams();
  const { data, isLoading, isError } = useQuery<FinancialDetail>({
    queryKey: ['financial-detail', id],
    queryFn: async () => {
      const response = await fetch(`/api/financial/transactions/${encodeURIComponent(id)}`);
      if (!response.ok) throw new Error('Transaction not found');
      return (await response.json()) as FinancialDetail;
    },
    enabled: !!id,
  });

  const from = data?.fromEntityName || 'Unknown source';
  const to = data?.toEntityName || 'Unknown recipient';
  const amount = formatCurrency(data?.amount || 0, data?.currency || 'USD');
  const title = `${from} to ${to}`;
  const citation = `Epstein Files Archive, financial transaction ${id}, ${amount}, accessed ${new Date().toISOString().slice(0, 10)}.`;

  return (
    <main className={styles.page}>
      <SEO
        title={data ? title : `Financial Transaction ${id}`}
        description={
          data
            ? `${amount} · ${data.transactionType || 'transaction'} · extracted financial record.`
            : 'Extracted financial record from the Epstein Files Archive.'
        }
        canonical={`https://epstein.academy/financial/${id}`}
        type="article"
      />
      <Link className={styles.crumb} to="/financial">
        <Icon name="ArrowLeft" size="sm" />
        Financial
      </Link>
      <Surface variant="panel" className={styles.hero}>
        <div className={styles.kicker}>
          <span className={styles.badge}>Financial Record</span>
          <span className={styles.badge}>
            {isLoading ? 'Loading' : isError ? 'Unavailable' : amount}
          </span>
          <span className={styles.badge}>Extracted</span>
        </div>
        <h1 className={styles.title}>{isLoading ? 'Loading transaction...' : title}</h1>
        <p className={styles.subtitle}>
          Extracted financial data should be used with source context. Amounts, dates, and parties
          may require normalization or human review.
        </p>
        <ShareCitationBar title={title} citation={citation} />
      </Surface>
      <div className={styles.grid}>
        <Surface variant="panel" className={styles.card}>
          <h2 className={styles.sectionTitle}>Transaction</h2>
          <div className={styles.factList}>
            <div className={styles.fact}>
              <span className={styles.label}>From</span>
              <span className={styles.value}>{from}</span>
            </div>
            <div className={styles.fact}>
              <span className={styles.label}>To</span>
              <span className={styles.value}>{to}</span>
            </div>
            <div className={styles.fact}>
              <span className={styles.label}>Amount</span>
              <span className={styles.value}>{amount}</span>
            </div>
          </div>
        </Surface>
        <Surface variant="panel" className={styles.card}>
          <h2 className={styles.sectionTitle}>Review Context</h2>
          <div className={styles.factList}>
            <div className={styles.fact}>
              <span className={styles.label}>Type</span>
              <span className={styles.value}>{data?.transactionType || 'Unknown'}</span>
            </div>
            <div className={styles.fact}>
              <span className={styles.label}>Date</span>
              <span className={styles.value}>
                {data?.date ? new Date(data.date).toLocaleDateString() : '—'}
              </span>
            </div>
            <div className={styles.fact}>
              <span className={styles.label}>Description</span>
              <span className={styles.value}>{data?.description || 'No description'}</span>
            </div>
          </div>
        </Surface>
      </div>
    </main>
  );
}
