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

const reviewCueForDocument = (doc: DocumentListItemDto): { label: string; detail: string } => {
  const coverage = doc.redactionCoverageAfter == null ? null : doc.redactionCoverageAfter;
  const normalizedCoverage = coverage == null ? null : coverage > 1 ? coverage : coverage * 100;

  if (doc.unredactionSucceeded) {
    return {
      label: 'Review recovered text',
      detail:
        'This document has machine-recovered text. Open it, compare the surrounding context, and only cite recovered material when the source document supports it.',
    };
  }

  if (doc.unredactionAttempted) {
    return {
      label: 'Check unresolved gaps',
      detail:
        'An unredaction pass already ran, but gaps remain. Prioritize high-confidence guesses and corroborate them against people, emails, and related filings.',
    };
  }

  if (normalizedCoverage != null && normalizedCoverage >= 20) {
    return {
      label: 'High-value review candidate',
      detail:
        'A large share of the document is still hidden. Start here when you need to understand whether a record has important missing names, dates, locations, or identifiers.',
    };
  }

  return {
    label: 'Spot-check for context',
    detail:
      'The remaining redaction signal is limited. Use this item to confirm whether the gaps affect search, entity matching, or evidence summaries.',
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
  const selectedReviewCue = selectedDocument ? reviewCueForDocument(selectedDocument) : null;
  const detectedSpans = redactionDetails?.redactions ?? [];
  const candidateCount = detectedSpans.reduce(
    (total, span) => total + (span.candidates?.length ?? 0),
    0,
  );
  const highConfidenceCount = detectedSpans.reduce(
    (total, span) =>
      total + (span.candidates?.filter((candidate) => candidate.confidence === 'high').length ?? 0),
    0,
  );

  return (
    <div className={styles.page}>
      <div className={styles.pageInner}>
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <Icon name="ScanText" size="lg" className={styles.titleIcon} />
            <div>
              <h1 className={styles.title}>Redaction Review Workspace</h1>
              <p className={styles.subtitle}>
                Find records where hidden text changes what you can search, cite, or trust. Use the
                queue to inspect redacted documents, compare recovered text with source context, and
                decide which gaps need human review.
              </p>
            </div>
          </div>
        </header>

        <section className={styles.explainer} aria-label="How redaction review helps">
          <div className={styles.explainerIntro}>
            <span className={styles.overline}>What this workspace is for</span>
            <p>
              Redactions are not just black boxes on a page. They can hide names, dates, locations,
              and identifiers that affect search results, entity pages, timelines, and evidence
              confidence. This view turns those gaps into a review queue.
            </p>
          </div>
          <div className={styles.workflowSteps}>
            <div className={styles.workflowStep}>
              <Icon name="SearchCheck" size="sm" />
              <span>Find documents where hidden text may matter</span>
            </div>
            <div className={styles.workflowStep}>
              <Icon name="Microscope" size="sm" />
              <span>Inspect each span with page context and machine guesses</span>
            </div>
            <div className={styles.workflowStep}>
              <Icon name="ShieldCheck" size="sm" />
              <span>Corroborate before using recovered text in analysis</span>
            </div>
          </div>
        </section>

        <section className={styles.statsGrid} aria-label="Redaction coverage summary">
          <Surface variant="glass-strong" className={styles.statCard}>
            <span className={styles.statLabel}>Redacted documents</span>
            <strong className={styles.statValue}>{formatNumber(stats.redacted)}</strong>
            <span className={styles.statSubline}>
              records with detected hidden or withheld text
            </span>
          </Surface>
          <Surface variant="glass-strong" className={styles.statCard}>
            <span className={styles.statLabel}>Corpus coverage</span>
            <strong className={styles.statValue}>
              {stats.pct.toLocaleString(undefined, { maximumFractionDigits: 1 })}%
            </strong>
            <span className={styles.statSubline}>
              of {formatNumber(stats.total)} measured docs need redaction awareness
            </span>
          </Surface>
          <Surface variant="glass-strong" className={styles.statCard}>
            <span className={styles.statLabel}>Review queue</span>
            <strong className={styles.statValue}>{formatNumber(documentsResponse?.total)}</strong>
            <span className={styles.statSubline}>documents ranked for hands-on inspection</span>
          </Surface>
        </section>

        <div className={styles.workspace}>
          <Surface variant="glass" className={styles.documentPanel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Documents To Inspect</h2>
                <p className={styles.panelMeta}>
                  {loading
                    ? 'Loading coverage...'
                    : `${formatNumber(documents.length)} shown, highest risk first`}
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
                <Button
                  unstyled
                  key={doc.id}
                  type="button"
                  className={`${styles.documentRow} ${
                    selectedDocument?.id === doc.id ? styles.documentRowActive : ''
                  }`}
                  onClick={() => setSelectedDocumentId(doc.id)}
                >
                  <div className={styles.documentRowInner}>
                    <span className={styles.documentTitle}>{doc.title}</span>
                    <span className={styles.documentPreview}>
                      {doc.previewText || doc.fileName}
                    </span>
                    <Flex align="center" gap="xs" className={styles.documentMeta}>
                      <span
                        className={`${styles.coveragePill} ${coverageSeverity(
                          doc.redactionCoverageAfter,
                        )}`}
                        title="Estimated share of text still hidden after recovery attempts"
                      >
                        Hidden: {formatCoverage(doc.redactionCoverageAfter)}
                      </span>
                      {doc.unredactionAttempted && (
                        <span className={styles.attemptPill}>
                          {doc.unredactionSucceeded ? 'Resolved' : 'Attempted'}
                        </span>
                      )}
                    </Flex>
                  </div>
                </Button>
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

                {selectedReviewCue && (
                  <div className={styles.nextAction}>
                    <div className={styles.nextActionIcon}>
                      <Icon name="Target" size="sm" />
                    </div>
                    <div>
                      <span className={styles.overline}>Recommended next step</span>
                      <h3>{selectedReviewCue.label}</h3>
                      <p>{selectedReviewCue.detail}</p>
                    </div>
                  </div>
                )}

                <div className={styles.coverageGrid}>
                  <div>
                    <span>Hidden before recovery</span>
                    <strong>{formatCoverage(selectedDocument.redactionCoverageBefore)}</strong>
                  </div>
                  <div>
                    <span>Hidden now</span>
                    <strong>{formatCoverage(selectedDocument.redactionCoverageAfter)}</strong>
                  </div>
                  <div>
                    <span>Recovered text gain</span>
                    <strong>
                      {selectedDocument.unredactedTextGain == null
                        ? 'Unknown'
                        : formatCoverage(selectedDocument.unredactedTextGain)}
                    </strong>
                  </div>
                </div>

                <section className={styles.spansSection}>
                  <div className={styles.spansHeader}>
                    <h3>Page-Level Redaction Spans</h3>
                    <span>
                      {redactionsLoading ? 'Loading...' : `${redactionDetails?.count ?? 0} spans`}
                    </span>
                  </div>
                  {!redactionsLoading && detectedSpans.length > 0 && (
                    <div className={styles.spanSummary}>
                      <span>{formatNumber(candidateCount)} inferred candidates</span>
                      <span>{formatNumber(highConfidenceCount)} high-confidence</span>
                      <span>Use guesses as leads, not facts</span>
                    </div>
                  )}
                  <div className={styles.spansList}>
                    {detectedSpans.slice(0, 12).map((span, index) => (
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
