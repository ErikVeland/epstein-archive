import React from 'react';
import type { ExtractionMethod, ProvenanceStatus, ReviewState } from '@shared/dto/provenance';
import s from './ProvenanceBadge.module.css';

export interface ProvenanceBadgeProps {
  sourceDocumentId?: number | null;
  sourceHash?: string | null;
  reviewState?: ReviewState;
  confidence?: number | null;
  extractionMethod?: ExtractionMethod | null;
  provenanceStatus?: ProvenanceStatus;
  showLabel?: boolean;
  className?: string;
}

const reviewStateConfig: Record<ReviewState, { label: string; icon: string; variant: string }> = {
  unreviewed: { label: 'Unreviewed', icon: '?', variant: 'unreviewed' },
  accepted: { label: 'Accepted', icon: 'A', variant: 'accepted' },
  rejected: { label: 'Rejected', icon: 'R', variant: 'rejected' },
  deferred: { label: 'Deferred', icon: 'D', variant: 'deferred' },
  insufficient_evidence: { label: 'Insufficient evidence', icon: 'I', variant: 'insufficient' },
};

const extractionMethodLabels: Record<ExtractionMethod, string> = {
  ocr: 'OCR extraction',
  manual: 'Manual entry',
  structured: 'Structured import',
  agentic: 'Agentic extraction',
};

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  sourceDocumentId,
  sourceHash,
  reviewState = 'unreviewed',
  confidence,
  extractionMethod,
  provenanceStatus,
  showLabel = true,
  className = '',
}) => {
  const stateConfig = reviewStateConfig[reviewState];
  const confidenceLabel =
    confidence != null ? `Confidence: ${Math.round(confidence * 100)}%` : null;
  const sourceLabel = sourceHash
    ? `Source hash: ${sourceHash.slice(0, 8)}...`
    : sourceDocumentId != null
      ? `Source document: ${sourceDocumentId}`
      : 'Source missing';

  const tooltipParts = [
    sourceLabel,
    confidenceLabel,
    extractionMethod ? extractionMethodLabels[extractionMethod] : null,
    provenanceStatus ? `Provenance: ${provenanceStatus}` : null,
  ].filter(Boolean);

  return (
    <span
      className={`${s.root} ${s[stateConfig.variant]} ${className}`}
      title={tooltipParts.join(' • ')}
      role="status"
      aria-label={`${stateConfig.label}${confidenceLabel ? `, ${confidenceLabel}` : ''}`}
    >
      <span className={s.icon}>{stateConfig.icon}</span>
      {showLabel && <span className={s.label}>{stateConfig.label}</span>}
      {(sourceHash || sourceDocumentId != null) && (
        <span className={s.sourceLink} aria-label="View source document">
          {sourceHash ? sourceHash.slice(0, 8) : `Doc ${sourceDocumentId}`}
        </span>
      )}
    </span>
  );
};
