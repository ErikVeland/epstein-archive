import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@client/components/common/Icon';
import { useBackLinkState } from '@client/hooks/useReliableBackNavigation';
import { apiClient } from '@client/services/apiClient';
import { Surface, Flex, Box, LqText } from '@client/design-system/lib';
import styles from './IntelligenceDashboard.module.css';

// ── API shape mirrors intelligenceRepository return types ────────────────────

interface WeakProvenanceDoc {
  documentId: number;
  fileName: string;
  docType: string | null;
  entityMentionCount: number;
  evidenceCount: number;
}

interface LowOcrDoc {
  documentId: number;
  fileName: string;
  avgOcrConfidence: number | null;
  ocrFlagCount: number;
}

interface FuzzyEntityAlias {
  entityId: number;
  entityName: string;
  aliasName: string;
  similarityScore: number | null;
}

interface ThinHighRiskEntity {
  entityId: number;
  entityName: string;
  riskLevel: string;
  evidenceCount: number;
  documentCount: number;
}

interface UnlinkedClaim {
  claimId: number;
  predicateText: string;
  objectText: string;
  subjectEntityId: number | null;
  subjectEntityName: string | null;
  confidence: number | null;
}

interface ReviewableFinancialItem {
  itemId: number;
  itemType: string;
  description: string | null;
  entityName: string | null;
  needsReview: boolean;
}

interface QueueCounts {
  weakProvenanceDocs: number;
  lowOcrDocs: number;
  fuzzyEntityAliases: number;
  thinHighRiskEntities: number;
  unlinkedClaims: number;
  reviewableFinancialItems: number;
}

interface ReviewData {
  weakProvenanceDocs: WeakProvenanceDoc[];
  lowOcrDocs: LowOcrDoc[];
  fuzzyEntityAliases: FuzzyEntityAlias[];
  thinHighRiskEntities: ThinHighRiskEntity[];
  unlinkedClaims: UnlinkedClaim[];
  reviewableFinancialItems: ReviewableFinancialItem[];
  counts: QueueCounts;
}

interface ReadinessData {
  semanticAvailable: boolean;
  provenanceCoveragePct: number | null;
  pendingMentionReviews: number;
  pendingClaimReviews: number;
  exportTestsNote: string;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function CountBadge({ count }: { count: number }) {
  return (
    <span
      className={count === 0 ? `${styles.countBadge} ${styles.countBadgeZero}` : styles.countBadge}
    >
      {count}
    </span>
  );
}

function EmptyQueue() {
  return <div className={styles.emptyQueue}>No items requiring review</div>;
}

function ReadinessTile({
  label,
  value,
  statusClass,
}: {
  label: string;
  value: string;
  statusClass?: string;
}) {
  return (
    <Surface className={styles.readinessTile}>
      <div className={styles.readinessTileLabel}>{label}</div>
      <div className={`${styles.readinessTileValue} ${statusClass ?? ''}`}>{value}</div>
    </Surface>
  );
}

function WeakProvenanceQueue({ items }: { items: WeakProvenanceDoc[] }) {
  const backLinkState = useBackLinkState();
  if (items.length === 0) return <EmptyQueue />;
  return (
    <div className={styles.queueList}>
      {items.map((doc) => (
        <div key={doc.documentId} className={styles.queueRow}>
          <div className={styles.queueRowBody}>
            <div className={styles.queueRowTitle}>{doc.fileName}</div>
            <div className={styles.queueRowMeta}>
              {doc.entityMentionCount} mention{doc.entityMentionCount !== 1 ? 's' : ''} ·{' '}
              {doc.evidenceCount} evidence link{doc.evidenceCount !== 1 ? 's' : ''}
              {doc.docType ? ` · ${doc.docType}` : ''}
            </div>
          </div>
          <Link
            to={`/documents?highlight=${doc.documentId}`}
            state={backLinkState}
            className={styles.queueRowLink}
            title="Open in Document Browser"
          >
            <Icon name="ExternalLink" size="sm" className={styles.linkIcon} />
          </Link>
        </div>
      ))}
    </div>
  );
}

function LowOcrQueue({ items }: { items: LowOcrDoc[] }) {
  const backLinkState = useBackLinkState();
  if (items.length === 0) return <EmptyQueue />;
  return (
    <div className={styles.queueList}>
      {items.map((doc) => (
        <div key={doc.documentId} className={styles.queueRow}>
          <div className={styles.queueRowBody}>
            <div className={styles.queueRowTitle}>{doc.fileName}</div>
            <div className={styles.queueRowMeta}>
              {doc.avgOcrConfidence !== null
                ? `Avg confidence: ${(doc.avgOcrConfidence * 100).toFixed(0)}%`
                : 'No confidence data'}
              {doc.ocrFlagCount > 0
                ? ` · ${doc.ocrFlagCount} flag${doc.ocrFlagCount !== 1 ? 's' : ''}`
                : ''}
            </div>
          </div>
          <Link
            to={`/documents?highlight=${doc.documentId}`}
            state={backLinkState}
            className={styles.queueRowLink}
            title="Open in Document Browser"
          >
            <Icon name="ExternalLink" size="sm" className={styles.linkIcon} />
          </Link>
        </div>
      ))}
    </div>
  );
}

function FuzzyAliasQueue({ items }: { items: FuzzyEntityAlias[] }) {
  const backLinkState = useBackLinkState();
  if (items.length === 0) return <EmptyQueue />;
  return (
    <div className={styles.queueList}>
      {items.map((alias, i) => (
        <div key={`${alias.entityId}-${i}`} className={styles.queueRow}>
          <div className={styles.queueRowBody}>
            <div className={styles.queueRowTitle}>{alias.entityName}</div>
            <div className={styles.queueRowMeta}>
              Alias: &quot;{alias.aliasName}&quot;
              {alias.similarityScore !== null
                ? ` · similarity ${(alias.similarityScore * 100).toFixed(0)}%`
                : ' · unscored'}
            </div>
          </div>
          <Link
            to={`/people?entity=${alias.entityId}`}
            state={backLinkState}
            className={styles.queueRowLink}
            title="Open entity"
          >
            <Icon name="ExternalLink" size="sm" className={styles.linkIcon} />
          </Link>
        </div>
      ))}
    </div>
  );
}

function ThinHighRiskQueue({ items }: { items: ThinHighRiskEntity[] }) {
  const backLinkState = useBackLinkState();
  if (items.length === 0) return <EmptyQueue />;
  return (
    <div className={styles.queueList}>
      {items.map((entity) => (
        <div key={entity.entityId} className={styles.queueRow}>
          <div className={styles.queueRowBody}>
            <div className={styles.queueRowTitle}>{entity.entityName}</div>
            <div className={styles.queueRowMeta}>
              {entity.evidenceCount} evidence · {entity.documentCount} document
              {entity.documentCount !== 1 ? 's' : ''}
            </div>
          </div>
          <Link
            to={`/people?entity=${entity.entityId}`}
            state={backLinkState}
            className={styles.queueRowLink}
            title="Open entity"
          >
            <Icon name="ExternalLink" size="sm" className={styles.linkIcon} />
          </Link>
        </div>
      ))}
    </div>
  );
}

function UnlinkedClaimsQueue({ items }: { items: UnlinkedClaim[] }) {
  if (items.length === 0) return <EmptyQueue />;
  return (
    <div className={styles.queueList}>
      {items.map((claim) => (
        <div key={claim.claimId} className={styles.queueRow}>
          <div className={styles.queueRowBody}>
            <div className={styles.queueRowTitle}>
              {claim.subjectEntityName ?? 'Unknown subject'} — {claim.predicateText}
            </div>
            <div className={styles.queueRowMeta}>
              {claim.objectText.slice(0, 80)}
              {claim.objectText.length > 80 ? '…' : ''}
              {claim.confidence !== null
                ? ` · confidence ${(claim.confidence * 100).toFixed(0)}%`
                : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FinancialReviewQueue({ items }: { items: ReviewableFinancialItem[] }) {
  if (items.length === 0) return <EmptyQueue />;
  return (
    <div className={styles.queueList}>
      {items.map((item) => (
        <div key={item.itemId} className={styles.queueRow}>
          <div className={styles.queueRowBody}>
            <div className={styles.queueRowTitle}>
              {item.description ?? `${item.itemType} #${item.itemId}`}
            </div>
            <div className={styles.queueRowMeta}>
              {item.entityName ?? 'No entity linked'} · {item.itemType}
            </div>
          </div>
          <Link to="/financial" className={styles.queueRowLink} title="Open Financial page">
            <Icon name="ExternalLink" size="sm" className={styles.linkIcon} />
          </Link>
        </div>
      ))}
    </div>
  );
}

interface QueueCardProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}

function QueueCard({ title, icon, count, children }: QueueCardProps) {
  return (
    <Surface className={styles.queueCard}>
      <div className={styles.queueCardHeader}>
        <div className={styles.queueCardTitle}>
          {icon}
          {title}
        </div>
        <CountBadge count={count} />
      </div>
      {children}
    </Surface>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export function IntelligenceDashboard() {
  const [review, setReview] = useState<ReviewData | null>(null);
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [reviewData, readinessData] = await Promise.all([
          apiClient.get<ReviewData>('/intelligence/review'),
          apiClient.get<ReadinessData>('/intelligence/readiness'),
        ]);
        if (!cancelled) {
          setReview(reviewData);
          setReadiness(readinessData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load intelligence data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box className={styles.page}>
      <Box className={styles.pageInner}>
        <Box className={styles.header}>
          <h1 className={styles.title}>
            <Icon name="Eye" size="lg" className={styles.titleIcon} />
            Intelligence Review
          </h1>
          <LqText className={styles.subtitle}>
            Post-ingest quality queues — surface weak evidence, unresolved aliases, and items
            requiring analyst attention.
          </LqText>
        </Box>

        {/* Release Readiness Widget */}
        {readiness && (
          <div className={styles.readinessGrid}>
            <ReadinessTile
              label="Semantic Search"
              value={readiness.semanticAvailable ? 'Available' : 'Keyword only'}
              statusClass={readiness.semanticAvailable ? styles.statusOk : styles.statusUnavailable}
            />
            <ReadinessTile
              label="Provenance Coverage"
              value={
                readiness.provenanceCoveragePct !== null
                  ? `${readiness.provenanceCoveragePct}%`
                  : 'N/A'
              }
              statusClass={
                readiness.provenanceCoveragePct === null
                  ? styles.statusUnavailable
                  : readiness.provenanceCoveragePct >= 80
                    ? styles.statusOk
                    : styles.statusWarn
              }
            />
            <ReadinessTile
              label="Pending Mention Reviews"
              value={String(readiness.pendingMentionReviews)}
              statusClass={
                readiness.pendingMentionReviews === 0 ? styles.statusOk : styles.statusWarn
              }
            />
            <ReadinessTile
              label="Pending Claim Reviews"
              value={String(readiness.pendingClaimReviews)}
              statusClass={
                readiness.pendingClaimReviews === 0 ? styles.statusOk : styles.statusWarn
              }
            />
          </div>
        )}

        {loading && (
          <div className={styles.loadingState}>
            <LqText>Loading intelligence queues…</LqText>
          </div>
        )}

        {error && (
          <Surface className={styles.readinessTile}>
            <Flex align="center" gap="3">
              <Icon name="AlertTriangle" size="sm" color="danger" />
              <LqText>{error}</LqText>
            </Flex>
          </Surface>
        )}

        {review && (
          <div className={styles.queuesGrid}>
            <QueueCard
              title="Weak Provenance"
              icon={<Icon name="FileQuestion" size="sm" className={styles.queueCardIcon} />}
              count={review.counts.weakProvenanceDocs}
            >
              <WeakProvenanceQueue items={review.weakProvenanceDocs} />
            </QueueCard>

            <QueueCard
              title="Low OCR Quality"
              icon={<Icon name="SearchX" size="sm" className={styles.queueCardIcon} />}
              count={review.counts.lowOcrDocs}
            >
              <LowOcrQueue items={review.lowOcrDocs} />
            </QueueCard>

            <QueueCard
              title="Fuzzy Entity Aliases"
              icon={<Icon name="BookOpen" size="sm" className={styles.queueCardIcon} />}
              count={review.counts.fuzzyEntityAliases}
            >
              <FuzzyAliasQueue items={review.fuzzyEntityAliases} />
            </QueueCard>

            <QueueCard
              title="Thin High-Risk Entities"
              icon={<Icon name="ShieldAlert" size="sm" className={styles.queueCardIcon} />}
              count={review.counts.thinHighRiskEntities}
            >
              <ThinHighRiskQueue items={review.thinHighRiskEntities} />
            </QueueCard>

            <QueueCard
              title="Unlinked Claims"
              icon={
                <Icon
                  name="AlertTriangle"
                  size="sm"
                  color="danger"
                  className={styles.queueCardIcon}
                />
              }
              count={review.counts.unlinkedClaims}
            >
              <UnlinkedClaimsQueue items={review.unlinkedClaims} />
            </QueueCard>

            <QueueCard
              title="Financial Items for Review"
              icon={<Icon name="Zap" size="sm" color="warning" className={styles.queueCardIcon} />}
              count={review.counts.reviewableFinancialItems}
            >
              <FinancialReviewQueue items={review.reviewableFinancialItems} />
            </QueueCard>
          </div>
        )}
      </Box>
    </Box>
  );
}
