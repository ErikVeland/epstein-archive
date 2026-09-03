import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Icon from '@client/components/common/Icon';
import { Button, Surface } from '@client/design-system/lib';
import { apiClient } from '@client/services/apiClient';
import type {
  DocumentRedactionsDto,
  RedactionFindingDto,
  RedactionIntelligenceSummaryDto,
  RedactionQueueDto,
} from '@shared/dto/redactions';
import styles from './RedactionsPage.module.css';

const formatNumber = (value: number | null | undefined): string =>
  Number(value || 0).toLocaleString();
const formatConfidence = (value: number): string => `${Math.round(value * 100)}%`;

const findingLabel = (finding: RedactionFindingDto): string => {
  if (finding.type === 'overlay_text_exposed') return 'Source-layer recovery';
  if (finding.type === 'contextual_hypothesis') return 'Contextual hypothesis';
  return 'Unresolved redaction';
};

const findingDescription = (finding: RedactionFindingDto): string => {
  if (finding.type === 'overlay_text_exposed') {
    return 'Readable PDF text was covered by a later opaque drawing object. The source file remains unchanged.';
  }
  if (finding.type === 'contextual_hypothesis') {
    return 'The model selected from names or identifiers already supported by this document and its entity links.';
  }
  return 'The source contains a redaction marker, but the available evidence does not support a candidate.';
};

export const RedactionsPage: React.FC = () => {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const { data: summary } = useQuery<RedactionIntelligenceSummaryDto>({
    queryKey: ['redactions', 'summary'],
    queryFn: () => apiClient.get('/documents/redactions/summary', { useCache: false }),
    staleTime: 60_000,
  });
  const {
    data: queue,
    isLoading: queueLoading,
    isError: queueError,
  } = useQuery<RedactionQueueDto>({
    queryKey: ['redactions', 'queue'],
    queryFn: () => apiClient.get('/documents/redactions/queue?limit=100', { useCache: false }),
    staleTime: 60_000,
  });
  const documents = useMemo(() => queue?.items ?? [], [queue?.items]);
  useEffect(() => {
    if (!selectedDocumentId && documents[0]) setSelectedDocumentId(documents[0].documentId);
  }, [documents, selectedDocumentId]);
  const selectedDocument = documents.find((item) => item.documentId === selectedDocumentId);
  const { data: details, isLoading: findingsLoading } = useQuery<DocumentRedactionsDto>({
    queryKey: ['redactions', 'document', selectedDocumentId],
    queryFn: () =>
      apiClient.get(`/documents/${encodeURIComponent(selectedDocumentId || '')}/redactions`, {
        useCache: false,
      }),
    enabled: Boolean(selectedDocumentId),
    staleTime: 60_000,
  });

  return (
    <div className={styles.page}>
      <div className={styles.pageInner}>
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <Icon name="ScanText" size="lg" className={styles.titleIcon} />
            <div>
              <h1 className={styles.title}>Redaction Intelligence</h1>
              <p className={styles.subtitle}>
                Inspect text hidden by PDF overlays and review evidence-backed candidates for names
                and identifiers. Original documents are never changed.
              </p>
            </div>
          </div>
        </header>

        <section className={styles.trustBoundary} aria-label="Evidence and confidence warning">
          <div className={styles.evidenceClass}>
            <Icon name="Layers" size="sm" />
            <div>
              <strong>Source-layer recovery</strong>
              <span>Machine-readable text exists beneath a later PDF drawing object.</span>
            </div>
          </div>
          <div className={styles.evidenceClass}>
            <Icon name="Sparkles" size="sm" />
            <div>
              <strong>Contextual hypothesis</strong>
              <span>An EXO model ranks only candidates already supported by archive context.</span>
            </div>
          </div>
          <div className={styles.warning}>
            <Icon name="AlertTriangle" size="sm" />
            <p>
              Confidence ranks machine-generated leads. It does not establish identity, accuracy,
              guilt, or truth. Verify each finding against the original document and independent
              evidence.
            </p>
          </div>
        </section>

        <section className={styles.statsGrid} aria-label="Redaction intelligence summary">
          {[
            ['Overlay text exposed', summary?.overlayRecoveries, 'structural PDF findings'],
            [
              'Contextual hypotheses',
              summary?.contextualHypotheses,
              'constrained archive candidates',
            ],
            ['Awaiting review', summary?.pendingReview, 'findings not yet corroborated'],
            ['Corroborated', summary?.corroborated, 'human-reviewed findings'],
          ].map(([label, value, detail]) => (
            <Surface variant="glass-strong" className={styles.statCard} key={String(label)}>
              <span className={styles.statLabel}>{label}</span>
              <strong className={styles.statValue}>
                {formatNumber(value as number | undefined)}
              </strong>
              <span className={styles.statSubline}>{detail}</span>
            </Surface>
          ))}
        </section>

        <div className={styles.workspace}>
          <Surface variant="glass" className={styles.documentPanel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Documents with findings</h2>
                <p className={styles.panelMeta}>
                  {queueLoading ? 'Loading findings…' : `${formatNumber(queue?.total)} documents`}
                </p>
              </div>
            </div>
            {queueError && (
              <div className={styles.emptyState}>The findings queue could not load.</div>
            )}
            {!queueError && !queueLoading && documents.length === 0 && (
              <div className={styles.emptyState}>
                No auditable findings are stored yet. Empty legacy “attempted” flags are not shown.
              </div>
            )}
            <div className={styles.documentList}>
              {documents.map((document) => (
                <Button
                  unstyled
                  key={document.documentId}
                  type="button"
                  className={`${styles.documentRow} ${selectedDocumentId === document.documentId ? styles.documentRowActive : ''}`}
                  onClick={() => setSelectedDocumentId(document.documentId)}
                >
                  <div className={styles.documentRowInner}>
                    <span className={styles.documentTitle}>{document.title}</span>
                    <span className={styles.documentPreview}>
                      {document.previewText || document.fileName}
                    </span>
                    <div className={styles.documentMeta}>
                      {document.overlayRecoveryCount > 0 && (
                        <span className={styles.overlayPill}>
                          {document.overlayRecoveryCount} exposed
                        </span>
                      )}
                      {document.hypothesisCount > 0 && (
                        <span className={styles.hypothesisPill}>
                          {document.hypothesisCount} hypotheses
                        </span>
                      )}
                      {document.unresolvedCount > 0 && (
                        <span className={styles.unresolvedPill}>
                          {document.unresolvedCount} unresolved
                        </span>
                      )}
                    </div>
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
                    <Link to={`/documents/${encodeURIComponent(selectedDocument.documentId)}`}>
                      Open original <Icon name="ArrowRight" size="sm" />
                    </Link>
                  </Button>
                </div>
                <section className={styles.findingsSection}>
                  <div className={styles.spansHeader}>
                    <h3>Auditable findings</h3>
                    <span>{findingsLoading ? 'Loading…' : `${details?.count || 0} findings`}</span>
                  </div>
                  <div className={styles.spansList}>
                    {(details?.findings || []).map((finding) => (
                      <article key={finding.id} className={styles.findingCard}>
                        <div className={styles.findingHeader}>
                          <span className={`${styles.typeBadge} ${styles[finding.type]}`}>
                            {findingLabel(finding)}
                          </span>
                          <span className={styles.confidence}>
                            {finding.type === 'unresolved_redaction'
                              ? 'No supported candidate'
                              : `${formatConfidence(finding.confidence)} confidence`}
                          </span>
                        </div>
                        <p className={styles.findingDescription}>{findingDescription(finding)}</p>
                        {finding.exposedText && finding.type === 'overlay_text_exposed' && (
                          <blockquote className={styles.exposedText}>
                            {finding.exposedText}
                          </blockquote>
                        )}
                        {finding.candidates.map((candidate) => (
                          <div
                            key={`${finding.id}-${candidate.value}`}
                            className={styles.candidateCard}
                          >
                            <span>Candidate {candidate.category}</span>
                            <strong>{candidate.value}</strong>
                            <p>{candidate.rationale}</p>
                            <small>
                              {formatConfidence(candidate.confidence)} contextual fit · supported in{' '}
                              {formatNumber(candidate.corroboratingDocumentCount)} document(s)
                            </small>
                          </div>
                        ))}
                        <div className={styles.provenanceRow}>
                          <span>Method: {finding.method}</span>
                          <span>Review: {finding.reviewStatus}</span>
                          {finding.modelId && <span>Model: {finding.modelId}</span>}
                        </div>
                        <Button asChild variant="ghost" size="sm">
                          <Link
                            to={`/documents/${encodeURIComponent(finding.documentId)}${finding.pageNumber ? `?page=${finding.pageNumber}` : ''}`}
                          >
                            View source{finding.pageNumber ? ` · page ${finding.pageNumber}` : ''}
                            <Icon name="ArrowRight" size="sm" />
                          </Link>
                        </Button>
                      </article>
                    ))}
                    {!findingsLoading && (details?.findings.length || 0) === 0 && (
                      <div className={styles.emptyState}>No stored findings for this document.</div>
                    )}
                  </div>
                </section>
              </>
            ) : (
              <div className={styles.emptyState}>Select a document to inspect its findings.</div>
            )}
          </Surface>
        </div>
      </div>
    </div>
  );
};

export default RedactionsPage;
