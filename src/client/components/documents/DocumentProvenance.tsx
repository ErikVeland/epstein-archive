import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from '../common/Icon';
import styles from './DocumentProvenance.module.css';

// Design System
import { Box } from '../../design-system/components/layout/Box';
import { Flex } from '../../design-system/components/layout/Flex';
import { LqText } from '../../design-system/components/typography/Text';

interface DocumentLineage {
  document: {
    id: number;
    fileName: string;
    file_name?: string;
    sourceCollection?: string;
    source_collection?: string;
    sourceOriginalUrl?: string;
    source_original_url?: string;
    credibilityScore: number;
    credibility_score?: number;
    ocrEngine?: string;
    ocr_engine?: string;
    ocrQualityScore?: number;
    ocr_quality_score?: number;
    processedAt?: string;
    ocr_processed_at?: string;
  };
  originalDocument: { id: number; fileName: string } | null;
  childDocuments: { id: number; file_name: string; page_number: number }[];
  processingInfo?: {
    ocrEngine?: string;
    ocrQualityScore?: number;
    processedAt?: string;
  };
  provenance?: {
    status?: string;
    score?: number;
    sourceSystem?: string;
    sourceRelease?: string;
    sourcePath?: string;
    sourceUrl?: string;
    acquisitionMethod?: string;
  };
  auditTrail: {
    timestamp: string;
    user: string;
    action: string;
    details: Record<string, unknown>;
  }[];
}

interface DocumentProvenanceProps {
  documentId: string | number;
  compact?: boolean;
}

export const DocumentProvenance: React.FC<DocumentProvenanceProps> = ({
  documentId,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(!compact);

  const {
    data: lineage = null,
    isLoading: loading,
    error: fetchError,
  } = useQuery<DocumentLineage | null>({
    queryKey: ['documentLineage', documentId],
    queryFn: async () => {
      if (!documentId) return null;
      const res = await fetch(`/api/documents/${documentId}/lineage`);
      if (!res.ok) throw new Error('Failed to fetch lineage');
      return res.json() as Promise<DocumentLineage>;
    },
    enabled: Boolean(documentId),
    staleTime: 30_000,
  });
  const error = fetchError instanceof Error ? fetchError.message : null;
  const sourceCollection =
    lineage?.document?.sourceCollection ||
    lineage?.document?.source_collection ||
    lineage?.provenance?.sourceRelease ||
    'Not specified';
  const credibilityScore =
    lineage?.document?.credibilityScore ?? lineage?.document?.credibility_score ?? null;
  const ocrEngine =
    lineage?.processingInfo?.ocrEngine ||
    lineage?.document?.ocrEngine ||
    lineage?.document?.ocr_engine;
  const ocrQualityScore =
    lineage?.processingInfo?.ocrQualityScore ??
    lineage?.document?.ocrQualityScore ??
    lineage?.document?.ocr_quality_score ??
    null;

  if (loading) {
    return (
      <Flex align="center" gap="sm" className={styles.padding2}>
        <Box className={styles.spinnerSmall} />
        <LqText variant="xs" color="muted">
          Loading provenance...
        </LqText>
      </Flex>
    );
  }

  if (error || !lineage) {
    return (
      <Box className={styles.padding2}>
        <LqText variant="xs" color="accent" className={styles.flexCenterGap1}>
          <Icon name="AlertCircle" size="xs" />
          {error || 'Not available'}
        </LqText>
      </Box>
    );
  }

  const getCredibilityStatus = (
    score: number | null,
  ): 'primary' | 'success' | 'warning' | 'accent' => {
    if (!score) return 'primary';
    if (score >= 0.9) return 'success';
    if (score >= 0.7) return 'warning';
    return 'accent';
  };

  const getCredibilityLabel = (score: number | null) => {
    if (!score) return 'Unknown';
    if (score >= 0.9) return 'Very High';
    if (score >= 0.8) return 'High';
    if (score >= 0.7) return 'Medium';
    return 'Low';
  };

  // Compact view for in-document display
  if (compact && !expanded) {
    return (
      <button onClick={() => setExpanded(true)} className={styles.closeButton}>
        <Flex align="center" gap="sm">
          <Icon name="Shield" size="xs" />
          <LqText variant="xs" color="muted">
            {sourceCollection || 'Source Info'}
          </LqText>
          <LqText variant="xs" weight="semibold" color={getCredibilityStatus(credibilityScore)}>
            ({getCredibilityLabel(credibilityScore)})
          </LqText>
          <Icon name="ChevronDown" size="xs" />
        </Flex>
      </button>
    );
  }

  return (
    <Box className={styles.root}>
      {/* Header */}
      <Box className={styles.header}>
        <LqText className={styles.headerTitle}>
          <Icon name="Shield" size="sm" className={styles.headerIcon} />
          Document Provenance
        </LqText>
        {compact && (
          <button onClick={() => setExpanded(false)} className={styles.closeButton}>
            <Icon name="X" size="sm" />
          </button>
        )}
      </Box>

      <Box className={styles.content}>
        {/* Source Info */}
        <Box className={styles.sourceGrid}>
          <Box>
            <LqText className={styles.fieldLabel}>Source Collection</LqText>
            <LqText className={styles.fieldValue}>{sourceCollection}</LqText>
          </Box>
          <Box>
            <LqText className={styles.fieldLabel}>Credibility</LqText>
            <LqText className={styles.fieldValue} color={getCredibilityStatus(credibilityScore)}>
              {credibilityScore
                ? `${Math.round(credibilityScore * 100)}% (${getCredibilityLabel(credibilityScore)})`
                : 'Not assessed'}
            </LqText>
          </Box>
        </Box>

        {/* OCR Info */}
        {ocrEngine && (
          <Box className={styles.ocrBadge}>
            <Box className={styles.ocrInfo}>
              <Icon name="FileSearch" size="xs" className={styles.ocrIcon} />
              <LqText variant="xs" color="muted">
                OCR:
              </LqText>
              <LqText variant="xs" weight="medium">
                {ocrEngine}
              </LqText>
            </Box>
            {ocrQualityScore && (
              <Box className={styles.ocrInfo}>
                <LqText variant="xs" color="muted">
                  Quality:
                </LqText>
                <LqText
                  variant="xs"
                  weight="medium"
                  color={ocrQualityScore >= 0.7 ? 'success' : 'warning'}
                >
                  {Math.round(ocrQualityScore * 100)}%
                </LqText>
              </Box>
            )}
          </Box>
        )}

        {/* Original Document */}
        {lineage.originalDocument && (
          <Box>
            <Flex align="center" gap="xs">
              <LqText variant="xs" color="muted">
                Extracted from:
              </LqText>
              <a href={`/documents/${lineage.originalDocument.id}`} className="link text-xs">
                {lineage.originalDocument.fileName}
              </a>
            </Flex>
          </Box>
        )}

        {/* Child Documents */}
        {lineage.childDocuments.length > 0 && (
          <Box className={styles.childDocuments}>
            <LqText variant="xs" color="muted" className={styles.marginBottom1}>
              Contains {lineage.childDocuments.length} pages:
            </LqText>
            <Box className={styles.pageTagList}>
              {lineage.childDocuments.slice(0, 5).map((child) => (
                <span key={child.id} className={styles.pageTag}>
                  Page {child.page_number}
                </span>
              ))}
              {lineage.childDocuments.length > 5 && (
                <LqText variant="xs" color="muted">
                  +{lineage.childDocuments.length - 5} more
                </LqText>
              )}
            </Box>
          </Box>
        )}

        {/* Audit Trail */}
        {lineage.auditTrail.length > 0 && (
          <Box className={styles.auditTrail}>
            <LqText variant="xs" color="muted" className={styles.marginBottom1}>
              Processing History:
            </LqText>
            <Box className={styles.trailList}>
              {lineage.auditTrail.map((entry, i) => (
                <Box key={i} className={styles.trailEntry}>
                  <Icon name="Clock" size="xs" />
                  <LqText variant="xs">{new Date(entry.timestamp).toLocaleDateString()}</LqText>
                  <LqText variant="xs" color="primary" className={styles.entryAction}>
                    {entry.action}
                  </LqText>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DocumentProvenance;
