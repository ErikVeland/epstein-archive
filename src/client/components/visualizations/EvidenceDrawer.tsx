import React from 'react';
import { X, FileText, ArrowRight, ShieldAlert } from 'lucide-react';
import styles from './EvidenceDrawer.module.css';

export interface Evidence {
  id: string;
  documentId: number;
  snippet: string;
  date: string | null;
  sourceType: 'document' | 'email' | 'flight_log';
  title: string; // From join
  risk: number; // From doc
  confidence: number;
  extractionMethod?: string;
  model?: string;
}

interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sourceLabel: string;
  targetLabel: string;
  relationshipType?: string;
  loading: boolean;
  documents: Evidence[];
  onDocumentClick?: (docId: number) => void;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  isOpen,
  onClose,
  sourceLabel,
  targetLabel,
  relationshipType,
  loading,
  documents,
  onDocumentClick,
}) => {
  if (!isOpen) return null;

  const getDocumentIconClassName = (risk: number) => {
    if (risk >= 4) return `${styles.documentIconWrap} ${styles.documentIconHighRisk}`;
    if (risk >= 2) return `${styles.documentIconWrap} ${styles.documentIconMediumRisk}`;
    return `${styles.documentIconWrap} ${styles.documentIconLowRisk}`;
  };

  const getRiskTextClassName = (risk: number) =>
    `${styles.riskText} ${risk >= 4 ? styles.riskTextHigh : styles.riskTextMedium}`;

  return (
    <div className={styles.drawer}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h3 className={styles.headerLabel}>Connection Evidence</h3>
          <div className={styles.headerTitle}>
            <span className={styles.headerEntity}>{sourceLabel}</span>
            <ArrowRight className={styles.headerArrow} />
            <span className={styles.headerEntity}>{targetLabel}</span>
          </div>
          {relationshipType && (
            <div className={styles.relationshipBadge}>{relationshipType.replace(/_/g, ' ')}</div>
          )}
        </div>
        <button onClick={onClose} className={styles.closeButton}>
          <X className={styles.closeIcon} />
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Locating intersection documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className={styles.emptyState}>
            <ShieldAlert className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No direct co-occurrence documents found.</p>
            <p className={styles.emptyText}>
              Link may be inferred from metadata or secondary connections.
            </p>
          </div>
        ) : (
          <div className={styles.documentList}>
            <p className={styles.documentCount}>Found {documents.length} Shared Documents</p>
            {documents.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => onDocumentClick?.(doc.documentId)}
                className={styles.documentButton}
                aria-label={`Open shared document ${doc.title}`}
              >
                <div className={styles.documentRow}>
                  <div className={getDocumentIconClassName(doc.risk || 0)}>
                    <FileText className={styles.documentIcon} />
                  </div>
                  <div className={styles.documentBody}>
                    <h4 className={styles.documentTitle}>{doc.title}</h4>

                    {/* Snippet Context */}
                    {doc.snippet && doc.snippet !== 'No snippet available' && (
                      <div className={styles.documentSnippet}>
                        "{doc.snippet.substring(0, 150)}
                        {doc.snippet.length > 150 ? '...' : ''}"
                      </div>
                    )}

                    <div className={styles.metaRow}>
                      <span className={styles.sourceTypeChip}>
                        {doc.sourceType.replace('_', ' ')}
                      </span>
                      {doc.date && <span>• {new Date(doc.date).toLocaleDateString()}</span>}
                      {doc.risk > 0 && (
                        <span className={getRiskTextClassName(doc.risk)}>• Risk {doc.risk}</span>
                      )}

                      {/* Provenance Lineage */}
                      {doc.extractionMethod && (
                        <div className={styles.traceLine}>
                          <span>Trace: {doc.extractionMethod}</span>
                          {doc.model && <span className={styles.modelTag}>({doc.model})</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className={styles.footerHint}>
        Press <span className={styles.keyTag}>ESC</span> to close
      </div>
    </div>
  );
};
