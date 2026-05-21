import React from 'react';
import Icon from '@client/components/common/Icon';
import { format } from 'date-fns';
import styles from './DocumentMetadataPanel.module.css';

interface DocumentMetadata {
  ai_provider?: string;
  ai_enriched_at?: string;
  ai_error?: string;
  temporal?: {
    primary?: string;
    min?: string;
    max?: string;
  };
  linguistics?: {
    readingLevel?: number;
    sentiment?: string;
  };
  source_collection?: string;
  source_original_url?: string;
  tags?: string[];
  [key: string]: unknown;
}

interface DocumentMetadataPanelProps {
  document: {
    id?: string | number;
    metadata?: DocumentMetadata;
    redFlagRating?: number | string;
    red_flag_rating?: number | string;
    extractedDate?: string;
    fileType?: string;
    file_type?: string;
    fileSize?: number;
    file_size?: number;
    contentHash?: string;
    content_hash?: string;
    tags?: string[];
    [key: string]: unknown;
  };
  analysis?: Record<string, unknown>;
  className?: string;
}

export const DocumentMetadataPanel: React.FC<DocumentMetadataPanelProps> = ({
  document,
  className = '',
}) => {
  const cx = (...classNames: Array<string | false | null | undefined>) =>
    classNames.filter(Boolean).join(' ');

  if (!document) return null;

  const metadata = (document.metadata || {}) as DocumentMetadata;
  const linguistics = metadata.linguistics || {};
  const aiSummary = typeof document.aiSummary === 'string' ? document.aiSummary : null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    try {
      return format(new Date(dateString), 'PP pp');
    } catch (_e) {
      return dateString;
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const riskRating = Number(document.redFlagRating ?? document.red_flag_rating ?? 0);
  const riskClass =
    riskRating >= 4
      ? 'risk-critical'
      : riskRating >= 3
        ? 'risk-high'
        : riskRating >= 2
          ? 'risk-medium'
          : 'risk-low';

  return (
    <div className={cx(styles.container, className)}>
      {/* AI Analysis - Premium Card */}
      {aiSummary && (
        <section className={styles.aiCard}>
          <div className={styles.aiCardDecoration}>
            <Icon name="Bot" size="xl" className={styles.aiCardDecorationIcon} />
          </div>
          <h3 className={styles.aiCardHeading}>
            <Icon name="Sparkles" size="xs" />
            AI Intelligence Summary
          </h3>
          <div className={styles.aiCardBody}>
            <p className={styles.aiSummaryText}>{aiSummary}</p>
            <div className={styles.aiMetaRow}>
              {metadata.ai_provider && (
                <div className={styles.aiMetaItem}>
                  <span className={styles.aiMetaLabel}>Model</span>
                  <span className={styles.aiProviderBadge}>{metadata.ai_provider}</span>
                </div>
              )}
              {metadata.ai_enriched_at && (
                <div className={styles.aiMetaItem}>
                  <span className={styles.aiMetaLabel}>Analyzed</span>
                  <span className={styles.aiMetaDate}>{formatDate(metadata.ai_enriched_at)}</span>
                </div>
              )}
            </div>
            {metadata.ai_error && (
              <div className={styles.aiError}>
                <Icon name="AlertTriangle" size="sm" />
                <span>{metadata.ai_error}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Temporal Analysis - NEW */}
      {(document.extractedDate || metadata.temporal) && (
        <section className={styles.temporalSection}>
          <h3 className={styles.temporalHeading}>
            <Icon name="Database" size="xs" />
            Temporal Intelligence
          </h3>
          <div className={styles.temporalGrid}>
            <div className={styles.temporalField}>
              <span className={styles.temporalLabel}>Extracted Primary Date</span>
              <div className={styles.temporalValueRow}>
                <span className={styles.temporalValue}>
                  {formatDate(document.extractedDate || metadata.temporal?.primary)}
                </span>
                <span className={styles.heuristicBadge}>Heuristic</span>
              </div>
            </div>

            {metadata.temporal?.min &&
              metadata.temporal?.max &&
              metadata.temporal.min !== metadata.temporal.max && (
                <div className={styles.temporalField}>
                  <span className={styles.temporalLabel}>Document Date Range</span>
                  <div className={styles.dateRangeValue}>
                    <span>{format(new Date(metadata.temporal.min), 'MMM yyyy')}</span>
                    <span className={styles.dateRangeSeparator}>-</span>
                    <span>{format(new Date(metadata.temporal.max), 'MMM yyyy')}</span>
                  </div>
                </div>
              )}
          </div>
        </section>
      )}

      {/* Analysis & Forensics Grid */}
      <section className={styles.forensicsGrid}>
        <div className={styles.forensicIndexCard}>
          <div className={styles.forensicCardDecoration}>
            <Icon name="Flag" size="xl" />
          </div>
          <div className={styles.forensicLabel}>Forensic Index</div>
          <div className={styles.forensicRatingRow}>
            <span className={styles.forensicRating}>{riskRating.toFixed(1)}</span>
            <span className={styles.forensicRatingMax}>/ 5.0</span>
          </div>
          <div className={styles.forensicChipWrapper}>
            <div className={`semantic-chip ${riskClass}`}>
              <Icon name="Shield" size="xs" />
              <span className={styles.chipLabel}>
                {riskRating >= 4
                  ? 'CRITICAL'
                  : riskRating >= 3
                    ? 'HIGH'
                    : riskRating >= 2
                      ? 'MEDIUM'
                      : 'LOW'}{' '}
                PRIORITY
              </span>
            </div>
          </div>
        </div>

        <div className={styles.signalCard}>
          <div className={styles.signalLabel}>Signal Integrity</div>
          <div className={styles.signalFields}>
            <div className={styles.signalRow}>
              <span className={styles.signalRowLabel}>Complexity</span>
              <span className={styles.signalValue}>
                {linguistics.readingLevel?.toFixed(1) || 'N/A'} (GRADE)
              </span>
            </div>
            <div className={styles.signalRow}>
              <span className={styles.signalRowLabel}>Forensic Tone</span>
              <span
                className={cx(
                  styles.signalValue,
                  linguistics.sentiment === 'negative'
                    ? styles.sentimentNegative
                    : linguistics.sentiment === 'positive'
                      ? styles.sentimentPositive
                      : styles.sentimentNeutral,
                )}
              >
                {linguistics.sentiment || 'OBJECTIVE'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* File Information - Stable List */}
      <section className={styles.verificationSection}>
        <h3 className={styles.sectionHeading}>
          <Icon name="Database" size="xs" />
          Forensic Verification (SHA-256)
        </h3>
        <dl className={styles.verificationGrid}>
          <div className={styles.verificationField}>
            <dt className={styles.verificationLabel}>Entry ID</dt>
            <dd className={styles.verificationIdValue}>{document.id}</dd>
          </div>
          <div className={styles.verificationField}>
            <dt className={styles.verificationLabel}>MIME Class</dt>
            <dd className={styles.verificationTextValue}>
              {document.fileType || document.file_type || 'RAW_DATA'}
            </dd>
          </div>
          <div className={styles.verificationField}>
            <dt className={styles.verificationLabel}>Data Weight</dt>
            <dd className={styles.verificationSizeValue}>
              {formatSize((document.fileSize || document.file_size) ?? 0)}
            </dd>
          </div>
          <div className={styles.verificationField}>
            <dt className={styles.verificationLabel}>Checksum</dt>
            <dd className={styles.verificationHashValue}>
              {document.contentHash || document.content_hash || 'NON_DETERMINISTIC_HASH'}
            </dd>
          </div>
        </dl>
      </section>

      {/* Sources & Classification */}
      <section className={styles.originSection}>
        <h3 className={styles.sectionHeading}>
          <Icon name="Globe" size="xs" />
          Data Origin
        </h3>
        <div className={styles.originFields}>
          <div className={styles.sourceCollectionBox}>
            <span className={styles.sourceCollectionMiniLabel}>Source Collection</span>
            <div className={styles.sourceCollectionValue}>
              <div className={styles.sourceCollectionDot} />
              {metadata.source_collection || 'UNCLASSIFIED_LEAK'}
            </div>
          </div>

          {metadata.source_original_url && (
            <div>
              <span className={styles.urlMiniLabel}>Raw Source URL</span>
              <a
                href={metadata.source_original_url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.sourceUrl}
              >
                {metadata.source_original_url}
              </a>
            </div>
          )}

          {((metadata.tags?.length ?? 0) > 0 || (document.tags?.length ?? 0) > 0) && (
            <div className={styles.tagsSection}>
              <span className={styles.tagsMiniLabel}>Semantic Tags</span>
              <div className={styles.tagsRow}>
                {[...(metadata.tags || []), ...(document.tags || [])].map(
                  (tag: string, i: number) => (
                    <span key={i} className={styles.tagChip}>
                      {tag}
                    </span>
                  ),
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
