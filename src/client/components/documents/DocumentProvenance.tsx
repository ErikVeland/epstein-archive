import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from '../common/Icon';

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
      <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm p-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--accent)]" />
        Loading provenance...
      </div>
    );
  }

  if (error || !lineage) {
    return (
      <div className="text-red-400 text-xs p-2">
        <Icon name="AlertCircle" size="xs" className="inline mr-1" />
        {error || 'Not available'}
      </div>
    );
  }

  const getCredibilityColor = (score: number | null) => {
    if (!score) return 'text-[var(--text-muted)]';
    if (score >= 0.9) return 'text-green-400';
    if (score >= 0.7) return 'text-yellow-400';
    return 'text-orange-400';
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
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
      >
        <Icon name="Shield" size="xs" />
        <span>{sourceCollection || 'Source Info'}</span>
        <span className={getCredibilityColor(credibilityScore)}>
          ({getCredibilityLabel(credibilityScore)})
        </span>
        <Icon name="ChevronDown" size="xs" />
      </button>
    );
  }

  return (
    <div className="bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] border border-[var(--glass-border)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--glass-bg-highlight)]/30 border-b border-[var(--glass-border)]">
        <h4 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
          <Icon name="Shield" size="sm" className="text-[var(--accent)]" />
          Document Provenance
        </h4>
        {compact && (
          <button
            onClick={() => setExpanded(false)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <Icon name="X" size="sm" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Source Info */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[var(--text-muted)]">Source Collection</span>
            <p className="text-[var(--text-primary)] font-medium">{sourceCollection}</p>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Credibility</span>
            <p className={`font-medium ${getCredibilityColor(credibilityScore)}`}>
              {credibilityScore
                ? `${Math.round(credibilityScore * 100)}% (${getCredibilityLabel(credibilityScore)})`
                : 'Not assessed'}
            </p>
          </div>
        </div>

        {/* OCR Info */}
        {ocrEngine && (
          <div className="flex items-center gap-4 text-xs bg-[var(--glass-bg-highlight)]/30 rounded px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Icon name="FileSearch" size="xs" className="text-purple-400" />
              <span className="text-[var(--text-muted)]">OCR:</span>
              <span className="text-[var(--text-primary)]">{ocrEngine}</span>
            </div>
            {ocrQualityScore && (
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--text-muted)]">Quality:</span>
                <span className={ocrQualityScore >= 0.7 ? 'text-green-400' : 'text-yellow-400'}>
                  {Math.round(ocrQualityScore * 100)}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Original Document */}
        {lineage.originalDocument && (
          <div className="text-xs">
            <span className="text-[var(--text-muted)]">Extracted from:</span>
            <a
              href={`/documents/${lineage.originalDocument.id}`}
              className="text-[var(--accent)] hover:underline ml-1"
            >
              {lineage.originalDocument.fileName}
            </a>
          </div>
        )}

        {/* Child Documents */}
        {lineage.childDocuments.length > 0 && (
          <div className="text-xs">
            <span className="text-[var(--text-muted)] mb-1 block">
              Contains {lineage.childDocuments.length} pages:
            </span>
            <div className="flex flex-wrap gap-1">
              {lineage.childDocuments.slice(0, 5).map((child) => (
                <span
                  key={child.id}
                  className="px-1.5 py-0.5 bg-[var(--glass-bg-highlight)] rounded text-[var(--text-secondary)]"
                >
                  Page {child.page_number}
                </span>
              ))}
              {lineage.childDocuments.length > 5 && (
                <span className="text-[var(--text-muted)]">
                  +{lineage.childDocuments.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Audit Trail */}
        {lineage.auditTrail.length > 0 && (
          <div className="text-xs">
            <span className="text-[var(--text-muted)] mb-1 block">Processing History:</span>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {lineage.auditTrail.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 text-[var(--text-muted)]">
                  <Icon name="Clock" size="xs" />
                  <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                  <span className="text-[var(--text-primary)]">{entry.action}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentProvenance;
