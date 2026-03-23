import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from '../common/Icon';
import type { IconName } from '../common/Icon';

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/30 rounded-[var(--radius-lg)] p-4 text-[var(--accent-danger)]">
        <Icon name="AlertTriangle" size="sm" className="inline mr-2" />
        Error loading metrics: {error}
      </div>
    );
  }

  if (!metrics) return null;

  const coverageColor =
    metrics.provenanceCoverage >= 90
      ? 'text-[var(--accent-success)]'
      : metrics.provenanceCoverage >= 70
        ? 'text-[var(--accent-warning)]'
        : 'text-[var(--accent-danger)]';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Icon name="BarChart3" size="md" />
          Data Quality Dashboard
        </h2>
        <span className="text-xs text-[var(--text-muted)]">
          Updated: {new Date(metrics.lastUpdated).toLocaleString()}
        </span>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      <div className="bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] p-4 border border-[var(--glass-border)]">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
          <Icon name="Database" size="sm" />
          Source Collections
        </h3>
        <div className="space-y-2">
          {metrics.sourceCollections.slice(0, 8).map((src) => {
            const percentage = ((src.count / metrics.totalDocuments) * 100).toFixed(1);
            return (
              <div key={src.name} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[var(--text-secondary)] truncate">{src.name}</span>
                    <span className="text-[var(--text-muted)]">
                      {src.count.toLocaleString()} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-[var(--glass-bg-highlight)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--accent-info)] to-[var(--accent)] rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Evidence Types */}
      <div className="bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] p-4 border border-[var(--glass-border)]">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
          <Icon name="Tag" size="sm" />
          Evidence Type Distribution
        </h3>
        <div className="flex flex-wrap gap-2">
          {metrics.evidenceTypeDistribution.slice(0, 10).map((ev) => (
            <span
              key={ev.type}
              className="px-2 py-1 bg-[var(--glass-bg-highlight)]/50 rounded text-xs text-[var(--text-secondary)] flex items-center gap-1"
            >
              <span className="capitalize">{ev.type.replace(/_/g, ' ')}</span>
              <span className="text-[var(--text-muted)]">({ev.count.toLocaleString()})</span>
            </span>
          ))}
        </div>
      </div>

      {/* Trust Indicator */}
      <div
        className={`bg-gradient-to-r ${
          metrics.provenanceCoverage >= 90
            ? 'from-[var(--accent-success)]/20 to-[var(--accent-success)]/5 border-[var(--accent-success)]/30'
            : 'from-[var(--accent-warning)]/20 to-[var(--accent-warning)]/5 border-[var(--accent-warning)]/30'
        } rounded-[var(--radius-lg)] p-4 border`}
      >
        <div className="flex items-center gap-3">
          <Icon
            name={metrics.provenanceCoverage >= 90 ? 'CheckCircle' : 'AlertCircle'}
            size="lg"
            className={coverageColor}
          />
          <div>
            <p className={`font-medium ${coverageColor}`}>
              {metrics.provenanceCoverage >= 90 ? 'High Data Quality' : 'Data Quality Notice'}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {metrics.provenanceCoverage}% of documents have verified source attribution
            </p>
          </div>
        </div>
      </div>

      {/* Data Integrity Issues */}
      {metrics.dataIntegrity &&
        (metrics.dataIntegrity.orphanedEntityMentions > 0 ||
          metrics.dataIntegrity.potentialJunkEntities > 0) && (
          <div className="bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] p-4 border border-[var(--accent-warning)]/30">
            <h3 className="text-sm font-medium text-[var(--accent-warning)] mb-3 flex items-center gap-2">
              <Icon name="AlertTriangle" size="sm" />
              Data Integrity Issues
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-[var(--accent-warning)]">
                  {metrics.dataIntegrity.orphanedEntityMentions.toLocaleString()}
                </p>
                <p className="text-xs text-[var(--text-muted)]">Orphaned Entity Mentions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[var(--accent-warning)]">
                  {metrics.dataIntegrity.potentialJunkEntities.toLocaleString()}
                </p>
                <p className="text-xs text-[var(--text-muted)]">Potential Junk Entities</p>
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
  const colorClasses = {
    cyan: 'from-[var(--accent-info)]/20 to-[var(--accent-info)]/5 border-[var(--accent)]/30 text-[var(--accent)]',
    green:
      'from-[var(--accent-success)]/20 to-[var(--accent-success)]/5 border-[var(--accent-success)]/30 text-[var(--accent-success)]',
    yellow:
      'from-[var(--accent-warning)]/20 to-[var(--accent-warning)]/5 border-[var(--accent-warning)]/30 text-[var(--accent-warning)]',
    red: 'from-[var(--accent-danger)]/20 to-[var(--accent-danger)]/5 border-[var(--accent-danger)]/30 text-[var(--accent-danger)]',
    purple:
      'from-[var(--accent)]/20 to-[var(--accent)]/5 border-[var(--accent)]/30 text-[var(--accent)]',
    blue: 'from-[var(--accent)]/20 to-[var(--accent)]/5 border-[var(--accent)]/30 text-[var(--accent)]',
  };

  return (
    <div
      className={`bg-gradient-to-br ${colorClasses[color]} rounded-[var(--radius-lg)] p-4 border`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon name={icon} size="sm" className={colorClasses[color].split(' ').pop()} />
        <span className="text-xs text-[var(--text-muted)]">{title}</span>
      </div>
      <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
    </div>
  );
};

export default DataQualityDashboard;
