import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { SEO } from '@client/components/common/SEO';
import Icon from '@client/components/common/Icon';
import { ShareCitationBar } from '@client/components/common/ShareCitationBar';
import { Surface } from '@client/design-system/lib';
import styles from './SharedDetailPage.module.css';

interface ClaimDetail {
  id: string;
  documentId: string;
  subjectEntityId: string | null;
  objectEntityId: string | null;
  predicate: string | null;
  objectText: string | null;
  claimText: string | null;
  confidence: number;
  modality: string;
  verified: number;
  createdAt: string;
  subjectName?: string;
  objectName?: string;
  documentTitle?: string;
}

export function ClaimDetailPage() {
  const { id = '' } = useParams();
  const { data, isLoading, isError } = useQuery<ClaimDetail>({
    queryKey: ['claim-detail', id],
    queryFn: async () => {
      const response = await fetch(`/api/claims/${encodeURIComponent(id)}`);
      if (!response.ok) throw new Error('Claim not found');
      return (await response.json()) as ClaimDetail;
    },
    enabled: !!id,
  });

  const subject = data?.subjectName || 'Unknown entity';
  const object = data?.objectName || data?.objectText || 'Unknown object';
  const predicate = data?.predicate || 'related to';
  const title = `${subject} ${predicate} ${object}`;
  const confidence = Math.round(Number(data?.confidence || 0) * 100);
  const sourceUrl = data?.documentId
    ? `/documents/${encodeURIComponent(String(data.documentId))}`
    : undefined;
  const citation = `Epstein Files Archive, AI claim ${id}, source document ${data?.documentId || 'unknown'}, confidence ${confidence}%, accessed ${new Date().toISOString().slice(0, 10)}.`;

  return (
    <main className={styles.page}>
      <SEO
        title={data ? title : `AI Claim ${id}`}
        description={
          data
            ? `${data.documentTitle || `Document ${data.documentId}`} · confidence ${confidence}% · requires human verification.`
            : 'AI-extracted claim from the Epstein Files Archive.'
        }
        canonical={`https://epstein.academy/claims/${id}`}
        type="article"
      />
      <Link className={styles.crumb} to="/intelligence">
        <Icon name="ArrowLeft" size="sm" />
        Intelligence
      </Link>
      <Surface variant="panel" className={styles.hero}>
        <div className={styles.kicker}>
          <span className={styles.badge}>AI Extracted</span>
          <span className={styles.badge}>
            {data?.verified === 1
              ? 'Human Verified'
              : data?.verified === 2
                ? 'Rejected'
                : 'Unreviewed'}
          </span>
          <span className={styles.badge}>
            {isLoading ? 'Loading' : isError ? 'Unavailable' : `${confidence}% Confidence`}
          </span>
        </div>
        <h1 className={styles.title}>{isLoading ? 'Loading claim...' : title}</h1>
        <p className={styles.subtitle}>
          This is a machine-extracted subject-predicate-object claim. Treat it as a lead until a
          human reviewer verifies the source context.
        </p>
        <ShareCitationBar title={title} citation={citation} sourceUrl={sourceUrl} />
      </Surface>
      <div className={styles.grid}>
        <Surface variant="panel" className={styles.card}>
          <h2 className={styles.sectionTitle}>Claim Triple</h2>
          <div className={styles.factList}>
            <div className={styles.fact}>
              <span className={styles.label}>Subject</span>
              <span className={styles.value}>{subject}</span>
            </div>
            <div className={styles.fact}>
              <span className={styles.label}>Predicate</span>
              <span className={styles.value}>{predicate}</span>
            </div>
            <div className={styles.fact}>
              <span className={styles.label}>Object</span>
              <span className={styles.value}>{object}</span>
            </div>
          </div>
        </Surface>
        <Surface variant="panel" className={styles.card}>
          <h2 className={styles.sectionTitle}>Provenance</h2>
          <div className={styles.factList}>
            <div className={styles.fact}>
              <span className={styles.label}>Source</span>
              <span className={styles.value}>
                {data?.documentTitle || data?.documentId || 'Pending'}
              </span>
            </div>
            <div className={styles.fact}>
              <span className={styles.label}>Method</span>
              <span className={styles.value}>Agentic extraction</span>
            </div>
            <div className={styles.fact}>
              <span className={styles.label}>Created</span>
              <span className={styles.value}>
                {data?.createdAt ? new Date(data.createdAt).toLocaleString() : '—'}
              </span>
            </div>
          </div>
        </Surface>
      </div>
    </main>
  );
}
