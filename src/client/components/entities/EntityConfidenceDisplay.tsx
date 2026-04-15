import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from '../common/Icon';
import { apiClient } from '../../services/apiClient';
import styles from './EntityConfidenceDisplay.module.css';

import { Button } from '../../design-system/lib';

interface EntityConfidence {
  entityId: string | number;
  entityName: string;
  confidenceScore: number;
  evidenceBreakdown: { evidence_type: string; count: number }[];
  totalMentions: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
}

interface EntityConfidenceDisplayProps {
  entityId: string | number;
  showBreakdown?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const EntityConfidenceDisplay: React.FC<EntityConfidenceDisplayProps> = ({
  entityId,
  showBreakdown = false,
  size = 'md',
}) => {
  const [expanded, setExpanded] = useState(showBreakdown);

  const { data: confidence = null, isLoading: loading } = useQuery<EntityConfidence | null>({
    queryKey: ['entityConfidence', entityId],
    queryFn: () => apiClient.getEntityConfidence(entityId) as Promise<EntityConfidence>,
    enabled: Boolean(entityId),
    staleTime: 30_000,
  });

  if (loading) {
    return <div className={styles.skeleton} />;
  }

  if (!confidence) {
    return null;
  }

  const getColor = (level: string) => {
    switch (level) {
      case 'High':
        return styles.levelHigh;
      case 'Medium':
        return styles.levelMedium;
      case 'Low':
        return styles.levelLow;
      default:
        return styles.levelDefault;
    }
  };

  const getIcon = (level: string) => {
    switch (level) {
      case 'High':
        return 'ShieldCheck';
      case 'Medium':
        return 'Shield';
      case 'Low':
        return 'AlertTriangle';
      default:
        return 'HelpCircle';
    }
  };

  const sizeClasses = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
  };

  // Simple badge
  if (!expanded) {
    return (
      <Button
        unstyled
        onClick={() => setExpanded(true)}
        className={`${styles.badge} ${getColor(confidence.confidenceLevel)} ${sizeClasses[size]}`}
        title={`Data confidence: ${confidence.confidenceScore}% based on ${confidence.totalMentions} mentions`}
      >
        <Icon name={getIcon(confidence.confidenceLevel)} />
        <span>{confidence.confidenceLevel}</span>
        <span className={styles.expandedScore}>({confidence.confidenceScore}%)</span>
      </Button>
    );
  }

  // Expanded breakdown
  return (
    <div className={`${styles.expanded} ${getColor(confidence.confidenceLevel)}`}>
      <div className={styles.expandedHeader}>
        <div className={styles.expandedHeaderLeft}>
          <Icon name={getIcon(confidence.confidenceLevel)} size="sm" />
          <span className={styles.expandedLabel}>{confidence.confidenceLevel} Confidence</span>
          <span className={styles.expandedScore}>{confidence.confidenceScore}%</span>
        </div>
        <Button unstyled onClick={() => setExpanded(false)} className={styles.collapseButton}>
          <Icon name="X" size="sm" />
        </Button>
      </div>

      <div className={styles.expandedBody}>
        <p className={styles.mentionCount}>
          Based on {confidence.totalMentions.toLocaleString()} references across verified sources
        </p>

        {/* Evidence breakdown */}
        {confidence.evidenceBreakdown.length > 0 && (
          <div className={styles.breakdownSection}>
            <span className={styles.breakdownLabel}>Evidence Sources:</span>
            <div className={styles.breakdownChips}>
              {confidence.evidenceBreakdown.map((ev) => (
                <span key={ev.evidence_type} className={styles.breakdownChip}>
                  {ev.evidence_type?.replace(/_/g, ' ') || 'document'} ({ev.count})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Confidence explanation */}
        <div className={styles.footerNote}>
          <Icon name="Info" /> Confidence is weighted by source type: legal documents (100%),
          testimony (90%), flight logs (85%), financial (80%), emails (70%), photos (50%).
        </div>
      </div>
    </div>
  );
};

// Compact inline badge version
export const EntityConfidenceBadge: React.FC<{ entityId: string | number }> = ({ entityId }) => {
  return <EntityConfidenceDisplay entityId={entityId} size="sm" />;
};

export default EntityConfidenceDisplay;
