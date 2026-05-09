import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Icon from '@client/components/common/Icon';
import { Button, Flex, Surface } from '@client/design-system/lib';
import { apiClient } from '@client/services/apiClient';
import type { AnalyticsSummaryDto } from '@shared/dto/analytics';
import type { DocumentListItemDto, DocumentsListResponseDto } from '@shared/dto/documents';
import styles from './RedactionsPage.module.css';

interface RedactionCandidate {
  original: string;
  guess?: string;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
  category: 'name' | 'email' | 'location' | 'date' | 'other';
}

interface RedactionSpan {
  page: number;
  text: string;
  bbox: unknown;
  resolvedText?: string;
  candidates?: RedactionCandidate[];
}

interface DocumentRedactionsResponse {
  hasFailedRedactions: boolean;
  count: number;
  redactions: RedactionSpan[];
}

const formatNumber = (value: number | null | undefined): string =>
  Number(value || 0).toLocaleString();

const formatCoverage = (value: number | null): string => {
  if (value == null) return 'Unmeasured';
  const normalized = value > 1 ? value : value * 100;
  return `${normalized.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
};

const coverageSeverity = (value: number | null): string => {
  if (value == null) return styles.coverageUnknown;
  const normalized = value > 1 ? value : value * 100;
  if (normalized >= 50) return styles.coverageCritical;
  if (normalized >= 20) return styles.coverageWarn;
  return styles.coverageLow;
};

const statValue = (
  analytics?: AnalyticsSummaryDto,
): { total: number; redacted: number; pct: number } => {
  const stats = analytics?.redactionStats;
  return {
    total: stats?.totalDocuments ?? analytics?.totalCounts.documents ?? 0,
    redacted: stats?.redactedCount ?? 0,
    pct: stats?.redactionPercentage ?? 0,
  };
};

export const RedactionsPage: React.FC = () => {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsSummaryDto>({
    queryKey: ['redactions', 'analytics'],
    queryFn: () => apiClient.get<AnalyticsSummaryDto>('/analytics/enhanced', { useCache: false }),
    staleTime: 60_000,
  });

  const {
    data: documentsResponse,
    isLoading: documentsLoading,
    isError: documentsError,
  } = useQuery<DocumentsListResponseDto>({
    queryKey: ['redactions', 'documents'],
    queryFn: () =>
      apiClient.getDocuments(
        {
          hasFailedRedactions: true,
          sortBy: 'red_flag',
          sortOrder: 'desc',
          includeMedia: false,
        },
        1,
        50,
      ),
    staleTime: 60_000,
  });

  const documents = useMemo(() => documentsResponse?.data ?? [], [documentsResponse?.data]);
  const selectedDocument = useMemo<DocumentListItemDto | undefined>(
    () => documents.find((doc) => doc.id === selectedDocumentId) ?? documents[0],
    [documents, selectedDocumentId],
  );

  const { data: redactionDetails, isLoading: redactionsLoading } =
    useQuery<DocumentRedactionsResponse>({
      queryKey: ['redactions', 'document', selectedDocument?.id],
      queryFn: () =>
        apiClient.get<DocumentRedactionsResponse>(
          `/documents/${encodeURIComponent(selectedDocument?.id || '')}/redactions`,
        ),
      enabled: Boolean(selectedDocument?.id),
      staleTime: 60_000,
    });

  const stats = statValue(analytics);
  const loading = analyticsLoading || documentsLoading;

  return (
    <div className={styles.page}>
      <div className={styles.pageInner}>
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <Icon name="ScanText" size="lg" className={styles.titleIcon} />
            <div>
              <h1 className={styles.title}>Redaction Workbench</h1>
              <p className={styles.subtitle}>
                Track withheld text, unredaction attempts, and document coverage from one review
                queue.
              </p>
            </div>
          </div>
        </header>

        <section className={styles.statsGrid} aria-label="Redaction coverage summary">
          <Surface variant="glass-strong" className={styles.statCard}>
            <span className={styles.statLabel}>Redacted documents</span>
            <strong className={styles.statValue}>{formatNumber(stats.redacted)}</strong>
            <span className={styles.statSubline}>of {formatNumber(stats.total)} measured docs</span>
          </Surface>
          <Surface variant="glass-strong" className={styles.statCard}>
            <span className={styles.statLabel}>Corpus coverage</span>
            <strong className={styles.statValue}>
              {stats.pct.toLocaleString(undefined, { maximumFractionDigits: 1 })}%
            </strong>
            <span className={styles.statSubline}>documents with redaction signals</span>
          </Surface>
          <Surface variant="glass-strong" className={styles.statCard}>
            <span className={styles.statLabel}>Review queue</span>
            <strong className={styles.statValue}>{formatNumber(documentsResponse?.total)}</strong>
            <span className={styles.statSubline}>filtered by redaction evidence</span>
          </Surface>
        </section>

        <div className={styles.workspace}>
          <Surface variant="glass" className={styles.documentPanel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Documents Needing Redaction Review</h2>
                <p className={styles.panelMeta}>
                  {loading ? 'Loading coverage...' : `${formatNumber(documents.length)} shown`}
                </p>
              </div>
            </div>

            {documentsError && (
              <div className={styles.emptyState}>Redaction documents could not be loaded.</div>
            )}
            {!documentsError && !loading && documents.length === 0 && (
              <div className={styles.emptyState}>No redaction-backed documents were returned.</div>
            )}

            <div className={styles.documentList}>
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  className={`${styles.documentRow} ${
                    selectedDocument?.id === doc.id ? styles.documentRowActive : ''
                  }`}
                  onClick={() => setSelectedDocumentId(doc.id)}
                >
                  <span className={styles.documentTitle}>{doc.title}</span>
                  <span className={styles.documentPreview}>{doc.previewText || doc.fileName}</span>
                  <Flex align="center" gap="xs" className={styles.documentMeta}>
                    <span
                      className={`${styles.coveragePill} ${coverageSeverity(
                        doc.redactionCoverageAfter,
                      )}`}
                    >
                      {formatCoverage(doc.redactionCoverageAfter)}
                    </span>
                    {doc.unredactionAttempted && (
                      <span className={styles.attemptPill}>
                        {doc.unredactionSucceeded ? 'Resolved' : 'Attempted'}
                      </span>
                    )}
                  </Flex>
                </button>
              ))}
            </div>
          </Surface>

          <Surface variant="glass-strong" className={styles.detailPanel}>
            {selectedDocument ? (
              <>
                <div className={styles.detailHeader}>
                  <div>
                    <h2 className={styles.detailTitle}>{selectedDocument.title}</h2>
                    <p className={styles.detailMeta}>{selectedDocument.fileName}</p>
                  </div>
                  <Button asChild variant="secondary" size="sm">
                    <Link to={`/documents/${encodeURIComponent(selectedDocument.id)}`}>
                      Open document
                      <Icon name="ArrowRight" size="sm" />
                    </Link>
                  </Button>
                </div>

                <div className={styles.coverageGrid}>
                  <div>
                    <span>Before</span>
                    <strong>{formatCoverage(selectedDocument.redactionCoverageBefore)}</strong>
                  </div>
                  <div>
                    <span>After</span>
                    <strong>{formatCoverage(selectedDocument.redactionCoverageAfter)}</strong>
                  </div>
                  <div>
                    <span>Recovered gain</span>
                    <strong>
                      {selectedDocument.unredactedTextGain == null
                        ? 'Unknown'
                        : formatCoverage(selectedDocument.unredactedTextGain)}
                    </strong>
                  </div>
                </div>

                <section className={styles.spansSection}>
                  <div className={styles.spansHeader}>
                    <h3>Detected Redaction Spans</h3>
                    <span>
                      {redactionsLoading ? 'Loading...' : `${redactionDetails?.count ?? 0} spans`}
                    </span>
                  </div>
                  <div className={styles.spansList}>
                    {(redactionDetails?.redactions ?? []).slice(0, 12).map((span, index) => (
                      <div key={`${span.page}-${index}`} className={styles.spanRow}>
                        <div className={styles.spanRowMain}>
                          <span className={styles.spanPage}>Page {span.page}</span>
                          <span className={styles.spanText}>
                            {span.text || 'No recovered text'}
                          </span>
                        </div>
                        {span.candidates && span.candidates.length > 0 && (
                          <div className={styles.candidatesList}>
                            {span.candidates.map((cand, idx) => (
                              <div key={idx} className={styles.candidateBadge}>
                                <span className={styles.candidateLabel}>Inferred Guess:</span>
                                <strong className={styles.candidateGuess}>
                                  {cand.guess || 'Unknown'}
                                </strong>
                                <span className={`${styles.confBadge} ${styles[cand.confidence]}`}>
                                  {cand.confidence} confidence
                                </span>
                                {cand.reason && (
                                  <span className={styles.candidateReason}>({cand.reason})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {!redactionsLoading && (redactionDetails?.redactions ?? []).length === 0 && (
                      <div className={styles.emptyState}>
                        No individual spans are stored for this document yet.
                      </div>
                    )}
                  </div>
                </section>
              </>
            ) : (
              <div className={styles.emptyState}>Select a document to inspect redaction spans.</div>
            )}
          </Surface>
        </div>
      </div>
    </div>
  );
};

export default RedactionsPage;
