import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from '../common/Icon';
import type { IconName } from '../common/Icon';
import s from './DataQualityDashboard.module.css';

interface DataQualityMetrics {
  totalDocuments: number;
  documentsWithProvenance: number;
  provenanceCoverage: number;
  sourceCollections: { name: string; count: number }[];
  evidenceTypeDistribution: { type: string; count: number }[];
  entityQuality: {
    total: number;
    withRoles: number;
    withRedFlagDescription: number;
    nullRedFlagRating?: number;
  };
  dataIntegrity?: {
    orphanedEntityMentions: number;
    potentialJunkEntities: number;
  };
  lastUpdated: string;
}

export const DataQualityDashboard: React.FC = () => {
  const {
    data: metrics = null,
    isLoading: loading,
    error: queryError,
  } = useQuery<DataQualityMetrics | null>({
    queryKey: ['data-quality-metrics'],
    queryFn: async () => {
      const res = await fetch('/api/data-quality/metrics');
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return res.json() as Promise<DataQualityMetrics>;
    },
    staleTime: 60_000,
  });
  const error = queryError instanceof Error ? queryError.message : null;

  if (loading) {
    return (
      <div className={s.loadingState}>
        <div className={s.spinner} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={s.errorBanner}>
        <Icon name="AlertTriangle" size="sm" className={s.errorIcon} />
        Error loading metrics: {error}
      </div>
    );
  }

  if (!metrics) return null;

  const coverageTone =
    metrics.provenanceCoverage >= 90
      ? 'success'
      : metrics.provenanceCoverage >= 70
        ? 'warning'
        : 'danger';

  return (
    <div className={s.dashboard}>
      {/* Header */}
      <div className={s.header}>
        <h2 className={s.heading}>
          <Icon name="BarChart3" size="md" />
          Data Quality Dashboard
        </h2>
        <span className={s.updatedAt}>
          Updated: {new Date(metrics.lastUpdated).toLocaleString()}
        </span>
      </div>

      {/* Key Metrics Grid */}
      <div className={s.metricGrid}>
        <MetricCard
          title="Total Documents"
          value={metrics.totalDocuments.toLocaleString()}
          icon="FileText"
          color="cyan"
        />
        <MetricCard
          title="Provenance Coverage"
          value={`${metrics.provenanceCoverage}%`}
          icon="Shield"
          color={
            metrics.provenanceCoverage >= 90
              ? 'green'
              : metrics.provenanceCoverage >= 70
                ? 'yellow'
                : 'red'
          }
        />
        <MetricCard
          title="Total Entities"
          value={metrics.entityQuality.total.toLocaleString()}
          icon="Users"
          color="purple"
        />
        <MetricCard
          title="Entities with Roles"
          value={`${Math.round((metrics.entityQuality.withRoles / metrics.entityQuality.total) * 100)}%`}
          icon="Users"
          color="blue"
        />
      </div>

      {/* Source Collections */}
      <div className={s.sectionCard}>
        <h3 className={s.sectionHeading}>
          <Icon name="Database" size="sm" />
          Source Collections
        </h3>
        <div className={s.collectionList}>
          {metrics.sourceCollections.slice(0, 8).map((src) => {
            const percentage = ((src.count / metrics.totalDocuments) * 100).toFixed(1);
            return (
              <div key={src.name} className={s.collectionRow}>
                <div className={s.collectionMeta}>
                  <div className={s.collectionLabels}>
                    <span className={s.collectionName}>{src.name}</span>
                    <span className={s.collectionValue}>
                      {src.count.toLocaleString()} ({percentage}%)
                    </span>
                  </div>
                  <div className={s.progressTrack}>
                    <div className={s.progressFill} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Evidence Types */}
      <div className={s.sectionCard}>
        <h3 className={s.sectionHeading}>
          <Icon name="Tag" size="sm" />
          Evidence Type Distribution
        </h3>
        <div className={s.chipList}>
          {metrics.evidenceTypeDistribution.slice(0, 10).map((ev) => (
            <span key={ev.type} className={s.evidenceChip}>
              <span className={s.evidenceType}>{ev.type.replace(/_/g, ' ')}</span>
              <span className={s.evidenceCount}>({ev.count.toLocaleString()})</span>
            </span>
          ))}
        </div>
      </div>

      {/* Trust Indicator */}
      <div className={`${s.trustIndicator} ${s[`trustIndicator--${coverageTone}`]}`}>
        <div className={s.trustRow}>
          <Icon
            name={metrics.provenanceCoverage >= 90 ? 'CheckCircle' : 'AlertCircle'}
            size="lg"
            className={s[`tone--${coverageTone}`]}
          />
          <div>
            <p className={`${s.trustTitle} ${s[`tone--${coverageTone}`]}`}>
              {metrics.provenanceCoverage >= 90 ? 'High Data Quality' : 'Data Quality Notice'}
            </p>
            <p className={s.trustBody}>
              {metrics.provenanceCoverage}% of documents have verified source attribution
            </p>
          </div>
        </div>
      </div>

      {/* Data Integrity Issues */}
      {metrics.dataIntegrity &&
        (metrics.dataIntegrity.orphanedEntityMentions > 0 ||
          metrics.dataIntegrity.potentialJunkEntities > 0) && (
          <div className={s.integrityCard}>
            <h3 className={s.integrityHeading}>
              <Icon name="AlertTriangle" size="sm" />
              Data Integrity Issues
            </h3>
            <div className={s.integrityGrid}>
              <div className={s.integrityMetric}>
                <p className={s.integrityValue}>
                  {metrics.dataIntegrity.orphanedEntityMentions.toLocaleString()}
                </p>
                <p className={s.integrityLabel}>Orphaned Entity Mentions</p>
              </div>
              <div className={s.integrityMetric}>
                <p className={s.integrityValue}>
                  {metrics.dataIntegrity.potentialJunkEntities.toLocaleString()}
                </p>
                <p className={s.integrityLabel}>Potential Junk Entities</p>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

// Helper component for metric cards
const MetricCard: React.FC<{
  title: string;
  value: string;
  icon: IconName;
  color: 'cyan' | 'green' | 'yellow' | 'red' | 'purple' | 'blue';
}> = ({ title, value, icon, color }) => {
  return (
    <div className={`${s.metricCard} ${s[`metricCard--${color}`]}`}>
      <div className={s.metricHeader}>
        <Icon name={icon} size="sm" className={s[`tone--${color}`]} />
        <span className={s.metricTitle}>{title}</span>
      </div>
      <p className={s.metricValue}>{value}</p>
    </div>
  );
};

export default DataQualityDashboard;
