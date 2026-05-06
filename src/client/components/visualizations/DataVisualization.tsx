import React, { useMemo } from 'react';
import Icon from '@client/components/common/Icon';
import { Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Person } from '@client/types';
import { TreeMap } from './TreeMap';
import { filterPeopleOnly, isJunkEntity } from '@client/utils/entityFilters';
import { useAnalytics } from '@client/contexts/AnalyticsContextState';
import { Button, Surface } from '@client/design-system/lib';
import ScopedErrorBoundary from '../common/ScopedErrorBoundary';
import styles from './DataVisualization.module.css';

interface EntityRecord {
  name?: string;
  fullName?: string;
  mentions?: number;
  redFlagRating?: number;
  entityType?: string;
  type?: string;
  junkTier?: string;
  junkFlag?: number;
  [key: string]: unknown;
}

export interface AnalyticsData {
  totalEntities?: number;
  totalMentions?: number;
  averageRedFlagRating?: number;
  totalUniqueRoles?: number;
  roleDistribution?: Array<{ role?: string; count?: number }>;
  activeInvestigations?: number;
  likelihoodDistribution?: Array<{ level?: string; count?: number }>;
  redFlagDistribution?: Array<{ rating?: number | string; count?: number }>;
  riskByType?: Array<{ riskLevel?: number | string; count?: number }>;
  topEntities?: Array<EntityRecord>;
  topConnectedEntities?: Array<EntityRecord>;
}

const COLORS = {
  HIGH: '#ef4444', // Red-500
  MEDIUM: '#f59e0b', // Amber-500
  LOW: '#10b981', // Emerald-500
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  accent: '#06b6d4',
  background: '#1e293b',
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ color?: string; fill?: string; name?: string; value: number }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.tooltipCard}>
        <p className={styles.tooltipTitle}>{label}</p>
        {payload.map(
          (
            entry: { color?: string; fill?: string; name?: string; value: number },
            index: number,
          ) => (
            <div key={index} className={styles.tooltipRow}>
              <div
                className={styles.tooltipSwatch}
                style={{ backgroundColor: entry.color || entry.fill }}
              />
              <span className={styles.tooltipLabel}>{entry.name}:</span>
              <span className={styles.tooltipValue}>{entry.value.toLocaleString()}</span>
            </div>
          ),
        )}
      </div>
    );
  }
  return null;
};

export const DataVisualization: React.FC = () => {
  const {
    filteredPeople: people = [],
    analyticsData,
    loading,
    error,
    onRetry,
    onPersonSelect,
  } = useAnalytics();

  const stats = useMemo(() => {
    if (analyticsData) {
      return {
        totalPeople: analyticsData.totalEntities || 0,
        highRisk: analyticsData.likelihoodDistribution?.find((d) => d.level === 'HIGH')?.count || 0,
        totalMentions: analyticsData.totalMentions || 0,
        avgRedFlag: analyticsData.averageRedFlagRating || 0,
        uniqueRoles: analyticsData.totalUniqueRoles || analyticsData.roleDistribution?.length || 0,
        activeInvestigations: analyticsData.activeInvestigations || 0,
      };
    }
    if (people.length > 0) {
      const highRisk = people.filter((p) => (p.redFlagRating ?? 0) >= 4).length;
      const totalMentions = people.reduce((acc, p) => acc + (p.mentions || 0), 0);
      const avgRedFlag = people.reduce((acc, p) => acc + (p.redFlagRating || 0), 0) / people.length;

      const uniqueRoles = new Set<string>();
      people.forEach((p) => {
        if (p.role) uniqueRoles.add(p.role);

        if (p.secondaryRoles && Array.isArray(p.secondaryRoles)) {
          p.secondaryRoles.forEach((r) => uniqueRoles.add(r));
        }
      });

      return {
        totalPeople: people.length,
        highRisk,
        totalMentions,
        avgRedFlag,
        uniqueRoles: uniqueRoles.size,
        activeInvestigations: 0,
      };
    }
    return {
      totalPeople: 0,
      highRisk: 0,
      totalMentions: 0,
      avgRedFlag: 0,
      uniqueRoles: 0,
      activeInvestigations: 0,
    };
  }, [people, analyticsData]);

  // Filter people to only Person types, excluding junk
  const filteredPersons = useMemo(() => filterPeopleOnly(people), [people]);

  // Prepare Data for Risk Distribution
  const riskDistribution = useMemo(() => {
    if (
      analyticsData?.redFlagDistribution &&
      Array.isArray(analyticsData.redFlagDistribution) &&
      analyticsData.redFlagDistribution.length > 0
    ) {
      const high = analyticsData.redFlagDistribution
        .filter((d) => Number(d.rating) >= 4)
        .reduce((acc, curr) => acc + Number(curr.count || 0), 0);
      const medium = analyticsData.redFlagDistribution
        .filter((d) => Number(d.rating) >= 2 && Number(d.rating) < 4)
        .reduce((acc, curr) => acc + Number(curr.count || 0), 0);
      const low = analyticsData.redFlagDistribution
        .filter((d) => Number(d.rating) < 2)
        .reduce((acc, curr) => acc + Number(curr.count || 0), 0);

      return [
        { name: 'High Risk (4-5)', value: high, color: COLORS.HIGH },
        { name: 'Medium Risk (2-3)', value: medium, color: COLORS.MEDIUM },
        { name: 'Low Risk (0-1)', value: low, color: COLORS.LOW },
      ];
    }

    if (
      analyticsData?.likelihoodDistribution &&
      Array.isArray(analyticsData.likelihoodDistribution) &&
      analyticsData.likelihoodDistribution.length > 0
    ) {
      const byLevel = new Map<string, number>(
        analyticsData.likelihoodDistribution.map((d) => [
          String(d.level || '').toUpperCase(),
          Number(d.count || 0),
        ]),
      );
      return [
        { name: 'High Risk (4-5)', value: byLevel.get('HIGH') || 0, color: COLORS.HIGH },
        { name: 'Medium Risk (2-3)', value: byLevel.get('MEDIUM') || 0, color: COLORS.MEDIUM },
        { name: 'Low Risk (0-1)', value: byLevel.get('LOW') || 0, color: COLORS.LOW },
      ];
    }

    // 1. Prefer analyticsData.riskByType (server-side aggregated)
    if (
      analyticsData?.riskByType &&
      Array.isArray(analyticsData.riskByType) &&
      analyticsData.riskByType.length > 0
    ) {
      const high = analyticsData.riskByType
        .filter((d) => Number(d.riskLevel) >= 4)
        .reduce((acc, curr) => acc + (curr.count || 0), 0);
      const medium = analyticsData.riskByType
        .filter((d) => Number(d.riskLevel) >= 2 && Number(d.riskLevel) < 4)
        .reduce((acc, curr) => acc + (curr.count || 0), 0);
      const low = analyticsData.riskByType
        .filter((d) => Number(d.riskLevel) < 2)
        .reduce((acc, curr) => acc + (curr.count || 0), 0);

      return [
        { name: 'High Risk (4-5)', value: high, color: COLORS.HIGH },
        { name: 'Medium Risk (2-3)', value: medium, color: COLORS.MEDIUM },
        { name: 'Low Risk (0-1)', value: low, color: COLORS.LOW },
      ];
    }

    // 2. Fallback to filteredPersons (client-side)
    return [
      {
        name: 'High Risk (4-5)',
        value: filteredPersons.filter((p) => (p.redFlagRating ?? 0) >= 4).length,
        color: COLORS.HIGH,
      },
      {
        name: 'Medium Risk (2-3)',
        value: filteredPersons.filter(
          (p) => (p.redFlagRating ?? 0) >= 2 && (p.redFlagRating ?? 0) < 4,
        ).length,
        color: COLORS.MEDIUM,
      },
      {
        name: 'Low Risk (0-1)',
        value: filteredPersons.filter((p) => (p.redFlagRating ?? 0) < 2).length,
        color: COLORS.LOW,
      },
    ];
  }, [filteredPersons, analyticsData]);

  // Prepare Data for Top Entities (Bar Chart)
  const topEntities = useMemo(() => {
    const source =
      analyticsData?.topConnectedEntities || analyticsData?.topEntities || filteredPersons;
    if (!source || !Array.isArray(source)) return [];

    return (source as EntityRecord[])
      .map((p) => ({
        name: (p.name || p.fullName || '').trim(),
        mentions: Number(p.mentions || 0),
        redFlagRating: Number(p.redFlagRating || 0),
        entityType: String(p.entityType || p.type || 'person').toLowerCase(),
        junkTier: String(p.junkTier || 'clean').toLowerCase(),
        junkFlag: Number(p.junkFlag || 0),
        person: p,
      }))
      .filter(
        (e) =>
          e.name.length > 0 &&
          e.mentions > 0 &&
          !isJunkEntity(e.name) &&
          (e.entityType.includes('person') ||
            e.entityType.includes('individual') ||
            e.entityType === 'unknown') &&
          e.junkTier !== 'junk' &&
          e.junkFlag === 0,
      )
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 50);
  }, [analyticsData, filteredPersons]);

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.errorState} ${styles.glassPanel}`}>
        <Icon name="AlertTriangle" className={styles.errorIcon} />
        <p className={styles.errorText}>{error}</p>
        <Button variant="secondary" size="sm" onClick={onRetry} className={styles.retryButton}>
          Retry Analysis
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Charts Row 1 */}
      <div className={styles.chartsGrid}>
        {/* Top Entities Bar Chart - Enhanced */}
        <Surface variant="panel" className={styles.glassCard}>
          <div className={styles.overlayIcon}>
            <Icon
              name="Activity"
              className={`${styles.overlayIconGraphic} ${styles.overlayAccent}`}
            />
          </div>

          <h3 className={styles.cardTitle}>
            <Icon name="Users" className={`${styles.titleIcon} ${styles.titleAccent}`} />
            <span className={styles.titleAccent}>Top Mentioned Individuals</span>
          </h3>

          {/* Microcopy for Top Entities Chart */}
          <div className={styles.microcopy}>
            <Icon name="Info" className={`${styles.microcopyIcon} ${styles.titleAccent}`} />
            <span>
              Individuals with the highest frequency of appearances across all analyzed documents.
              Colors indicate risk level. Click to view details.
            </span>
          </div>

          <div className={styles.chartScroller}>
            {topEntities.length === 0 ? (
              <div className={styles.emptyChart}>
                No non-junk person entities with mentions available.
              </div>
            ) : (
              topEntities.map((entry, index: number) => {
                const maxMentions = Math.max(1, topEntities[0]?.mentions || 1);
                const barWidth = Math.max(4, Math.round((entry.mentions / maxMentions) * 100));
                const risk = entry.redFlagRating;
                const riskLabel =
                  risk >= 5
                    ? 'Critical'
                    : risk >= 4
                      ? 'High'
                      : risk >= 3
                        ? 'Elevated'
                        : risk >= 2
                          ? 'Guarded'
                          : 'Low';

                return (
                  <Button
                    key={`${entry.name}-${index}`}
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      onPersonSelect && onPersonSelect(entry.person as unknown as Person)
                    }
                    className={styles.rankRow}
                  >
                    <div className={styles.rankGrid}>
                      <div className={styles.rankBadge}>{index + 1}</div>
                      <div className={styles.minWidthZero}>
                        <div className={styles.rankName}>{entry.name}</div>
                        <div className={styles.rankBarTrack}>
                          <div className={styles.rankBarFill} style={{ width: `${barWidth}%` }} />
                        </div>
                      </div>
                      <div className={styles.rankMeta}>
                        <div className={styles.rankCount}>{entry.mentions.toLocaleString()}</div>
                        <div
                          className={`${styles.riskBadge} ${
                            risk >= 5
                              ? styles.riskCritical
                              : risk >= 4
                                ? styles.riskHigh
                                : risk >= 3
                                  ? styles.riskElevated
                                  : risk >= 2
                                    ? styles.riskGuarded
                                    : styles.riskLow
                          }`}
                        >
                          {riskLabel}
                        </div>
                      </div>
                    </div>
                  </Button>
                );
              })
            )}
          </div>
        </Surface>

        {/* Risk Distribution Pie Chart */}
        <Surface variant="panel" className={styles.glassCard}>
          <div className={styles.overlayIcon}>
            <Icon
              name="ShieldAlert"
              className={`${styles.overlayIconGraphic} ${styles.overlayWarning}`}
            />
          </div>

          <h3 className={styles.cardTitle}>
            <Icon name="AlertTriangle" className={`${styles.titleIcon} ${styles.titleWarning}`} />
            <span>Risk Level Distribution</span>
          </h3>
          {/* Microcopy for Risk Distribution Chart */}
          <div className={styles.microcopy}>
            <Icon name="Info" className={`${styles.microcopyIcon} ${styles.titleWarning}`} />
            <span>
              Breakdown of entities by Red Flag Index score (0-5), indicating the density of
              connection to illicit activities.
            </span>
          </div>
          <div className={styles.chartArea}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text Overlay */}
            <div className={styles.chartCenterOverlay}>
              <span className={styles.centerValue}>{stats.totalPeople.toLocaleString()}</span>
              <span className={styles.centerLabel}>Entities</span>
            </div>
          </div>
          {/* Legend */}
          <div className={styles.legendRow}>
            {riskDistribution.map((item, index) => (
              <div key={index} className={styles.legendPill}>
                <div className={styles.legendDot} style={{ backgroundColor: item.color }} />
                <span className={styles.legendText}>{item.name}</span>
              </div>
            ))}
          </div>
        </Surface>
      </div>

      {/* Interactive Tree Map */}
      <Surface variant="panel" className={styles.glassCard}>
        <div className={styles.treeHeader}>
          <h3 className={styles.cardTitle}>
            <Icon name="Activity" className={`${styles.titleIcon} ${styles.titlePurple}`} />
            <span className={styles.titleGradient}>Interactive Entity Map</span>
          </h3>
          <span className={styles.treeBadge}>Top 50 by Mentions</span>
        </div>

        {/* Microcopy for Tree Map */}
        <div className={styles.microcopy}>
          <Icon name="Info" className={`${styles.microcopyIcon} ${styles.titlePurple}`} />
          <span>
            Visual representation of entity prominence. Box size correlates to mention frequency.
            Click any box to view detailed evidence.
          </span>
        </div>

        <div>
          <ScopedErrorBoundary
            fallback={
              <div className={styles.treeFallback}>
                <div>
                  <Icon name="AlertTriangle" className={styles.treeFallbackIcon} />
                  <p className={styles.treeFallbackTitle}>TreeMap Rendering Failed</p>
                  <p className={styles.treeFallbackText}>
                    The entity data could not be visualized.
                  </p>
                </div>
              </div>
            }
          >
            <TreeMap
              people={topEntities.map((entry: Record<string, unknown>) => ({
                ...(entry.person && typeof entry.person === 'object'
                  ? (entry.person as Record<string, unknown>)
                  : {}),
                name: String(entry.name || ''),
                fullName: String(entry.name || ''),
                mentions: Number(entry.mentions || 0),
                redFlagRating: Number(entry.redFlagRating || 0),
                entityType: String(entry.entityType || ''),
                junkTier: Number(entry.junkTier ?? 0),
                junkFlag: Boolean(entry.junkFlag),
              }))}
            />
          </ScopedErrorBoundary>
        </div>
      </Surface>

      {/* Summary Statistics Footer */}
      <div className={styles.summaryGrid}>
        <div className={`${styles.summaryCard} ${styles.glassPanel}`}>
          <div className={`${styles.summaryValue} ${styles.summaryValueAccent}`}>
            {stats.totalPeople.toLocaleString()}
          </div>
          <div className={`${styles.summaryLabel} ${styles.summaryLabelInline}`}>
            Total Individuals
          </div>
        </div>
        <div className={`${styles.summaryCard} ${styles.glassPanel}`}>
          <div className={`${styles.summaryValue} ${styles.summaryValueAccent}`}>
            {stats.totalPeople > 0 ? Math.round(stats.totalMentions / stats.totalPeople) : 0}
          </div>
          <div className={styles.summaryLabel}>Avg Mentions</div>
        </div>
        <div className={`${styles.summaryCard} ${styles.glassPanel}`}>
          <div className={`${styles.summaryValue} ${styles.summaryValuePurple}`}>
            {stats.uniqueRoles.toLocaleString()}
          </div>
          <div className={styles.summaryLabel}>Unique Roles</div>
        </div>
        <div className={`${styles.summaryCard} ${styles.glassPanel}`}>
          <div className={`${styles.summaryValue} ${styles.summaryValuePink}`}>
            {(() => {
              const source = people.length > 0 ? people : analyticsData?.topConnectedEntities || [];
              if (source.length === 0) return '0';
              return Math.max(
                ...(source as EntityRecord[]).map((p) => Number(p?.mentions || 0)),
              ).toLocaleString();
            })()}
          </div>
          <div className={styles.summaryLabel}>Max Mentions</div>
        </div>
      </div>
    </div>
  );
};
