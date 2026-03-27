import React, { useState, useEffect, useMemo } from 'react';
import { Info, Users, AlertTriangle, Activity, ShieldAlert } from 'lucide-react';
import { Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Person } from '../../types';
import { TreeMap } from './TreeMap';
import { filterPeopleOnly, isJunkEntity } from '../../utils/entityFilters';
import { useAnalytics } from '../../contexts/AnalyticsContextState';
import ScopedErrorBoundary from '../common/ScopedErrorBoundary';
import { Surface, cn } from '@design-system';
import './DataVisualization.css';

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
      <div className="bg-[var(--glass-bg-strong)]/95 backdrop-blur-md p-4 rounded-[var(--radius-xl)] shadow-[var(--glass-shadow)] border border-[var(--glass-border)]">
        <p className="text-[var(--text-primary)] font-bold mb-2 text-sm">{label}</p>
        {payload.map(
          (
            entry: { color?: string; fill?: string; name?: string; value: number },
            index: number,
          ) => (
            <div key={index} className="flex items-center gap-3 text-sm">
              <div
                className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                style={{ backgroundColor: entry.color || entry.fill }}
              />
              <span className="text-[var(--text-secondary)] font-medium">{entry.name}:</span>
              <span className="text-[var(--text-primary)] font-mono font-bold">
                {entry.value.toLocaleString()}
              </span>
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

  const [stats, setStats] = useState({
    totalPeople: 0,
    highRisk: 0,
    totalMentions: 0,
    avgRedFlag: 0,
    uniqueRoles: 0,
    activeInvestigations: 0,
  });

  useEffect(() => {
    if (analyticsData) {
      setStats({
        totalPeople: analyticsData.totalEntities || 0,
        highRisk: analyticsData.likelihoodDistribution?.find((d) => d.level === 'HIGH')?.count || 0,
        totalMentions: analyticsData.totalMentions || 0,
        avgRedFlag: analyticsData.averageRedFlagRating || 0,
        uniqueRoles: analyticsData.totalUniqueRoles || analyticsData.roleDistribution?.length || 0,
        activeInvestigations: analyticsData.activeInvestigations || 0,
      });
    } else if (people.length > 0) {
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

      setStats({
        totalPeople: people.length,
        highRisk,
        totalMentions,
        avgRedFlag,
        uniqueRoles: uniqueRoles.size,
        activeInvestigations: 0,
      });
    }
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
      <div className="stack-x v-center h-center" style={{ height: '24rem' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-400 glass-card rounded-[var(--radius-xl)]">
        <AlertTriangle className="mx-auto h-12 w-12 mb-4 opacity-80" />
        <p className="text-lg mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-[var(--glass-bg)] rounded-[var(--radius-lg)] hover:bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] transition-all"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  return (
    <div className="stack-y gap-8 animate-in fade-in duration-500">
      {/* Charts Row 1 */}
      <div className="viz-grid">
        {/* Top Entities Bar Chart - Enhanced */}
        <div className="glass-card p-6 rounded-[var(--radius-xl)] shadow-[var(--glass-shadow)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="h-24 w-24 text-[var(--accent)]" />
          </div>

          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6 stack-x v-center gap-2 wrap relative z-10">
            <Users className="h-5 w-5 text-[var(--accent)]" />
            <span className="neon-text-cyan">Top Mentioned Individuals</span>
          </h3>

          {/* Microcopy for Top Entities Chart */}
          <div className="text-xs text-[var(--text-muted)] mb-6 stack-x v-start gap-2 bg-[var(--glass-bg-strong)]/50 p-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] backdrop-blur-sm relative z-10">
            <Info className="h-4 w-4 mt-0.5 no-shrink text-[var(--accent)]" />
            <span>
              Individuals with the highest frequency of appearances across all analyzed documents.
              Colors indicate risk level. Click to view details.
            </span>
          </div>

          <div className="h-[400px] relative z-10 overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {topEntities.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
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
                const riskColor =
                  risk >= 5
                    ? 'risk-tag-critical'
                    : risk >= 4
                      ? 'risk-tag-high'
                      : risk >= 3
                        ? 'risk-tag-elevated'
                        : risk >= 2
                          ? 'risk-tag-guarded'
                          : 'risk-tag-low';

                return (
                  <button
                    key={`${entry.name}-${index}`}
                    type="button"
                    onClick={() =>
                      onPersonSelect && onPersonSelect(entry.person as unknown as Person)
                    }
                    className="entity-ranking-card"
                  >
                    <div className="grid grid-cols-[40px_minmax(0,1fr)_120px] v-center gap-3">
                      <div className="ranking-number">{index + 1}</div>
                      <div className="min-w-0">
                        <div className="text-[var(--text-primary)] font-semibold truncate">
                          {entry.name}
                        </div>
                        <div className="ranking-bar-container">
                          <div className="ranking-bar" style={{ width: `${barWidth}%` }} />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[var(--text-primary)] font-mono text-sm">
                          {entry.mentions.toLocaleString()}
                        </div>
                        <div className={cn('risk-tag', riskColor)}>{riskLabel}</div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Risk Distribution Pie Chart */}
        <div className="glass-card p-6 rounded-[var(--radius-xl)] shadow-[var(--glass-shadow)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldAlert className="h-24 w-24 text-orange-500" />
          </div>

          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6 stack-x v-center gap-2 relative z-10">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            <span>Risk Level Distribution</span>
          </h3>
          {/* Microcopy for Risk Distribution Chart */}
          <div className="text-xs text-[var(--text-muted)] mb-6 stack-x v-start gap-2 bg-[var(--glass-bg-strong)]/50 p-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] backdrop-blur-sm relative z-10">
            <Info className="h-4 w-4 mt-0.5 no-shrink text-orange-400" />
            <span>
              Breakdown of entities by Red Flag Index score (0-5), indicating the density of
              connection to illicit activities.
            </span>
          </div>
          <div className="h-[400px] relative z-10">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-bold text-[var(--text-primary)] drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                {stats.totalPeople.toLocaleString()}
              </span>
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1 font-semibold">
                Entities
              </span>
            </div>
          </div>
          {/* Legend */}
          <div className="stack-x h-center gap-4 mt-4 relative z-10 wrap">
            {riskDistribution.map((item, index) => (
              <div
                key={index}
                className="stack-x v-center gap-2 px-3 py-1 bg-[var(--glass-bg-strong)]/40 rounded-full border border-[var(--glass-border)]"
              >
                <div
                  className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-[var(--text-secondary)] font-medium">
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Tree Map */}
      <div className="glass-card p-6 rounded-[var(--radius-xl)] shadow-[var(--glass-shadow)] relative overflow-hidden">
        <div className="stack-y sm:stack-x v-center h-between mb-6 gap-4 relative z-10">
          <h3 className="text-xl font-bold text-[var(--text-primary)] stack-x v-center gap-2">
            <Activity className="h-5 w-5 text-purple-400" />
            <span className="text-transparent bg-clip-text gradient-purple-pink">
              Interactive Entity Map
            </span>
          </h3>
          <span className="text-xs font-medium px-3 py-1 bg-purple-500/10 text-purple-300 rounded-full border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
            Top 50 by Mentions
          </span>
        </div>

        {/* Microcopy for Tree Map */}
        <div className="text-xs text-[var(--text-muted)] mb-6 stack-x v-start gap-2 bg-[var(--glass-bg-strong)]/50 p-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] backdrop-blur-sm relative z-10">
          <Info className="h-4 w-4 mt-0.5 no-shrink text-purple-400" />
          <span>
            Visual representation of entity prominence. Box size correlates to mention frequency.
            Click any box to view detailed evidence.
          </span>
        </div>

        <div className="relative z-10">
          <ScopedErrorBoundary
            fallback={
              <div className="flex h-64 items-center justify-center rounded-[var(--radius-xl)] bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 p-8 text-center text-[var(--accent-danger)]">
                <div>
                  <AlertTriangle className="mx-auto mb-2 h-8 w-8" />
                  <p className="font-bold">TreeMap Rendering Failed</p>
                  <p className="text-sm opacity-80">The entity data could not be visualized.</p>
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
      </div>

      {/* Summary Statistics Footer */}
      <div className="stats-summary-grid">
        <div className="glass-card stat-widget hover:bg-[var(--glass-bg)]/60 transition-colors group">
          <div className="stat-value group-hover:text-[var(--accent)] transition-colors">
            {stats.totalPeople.toLocaleString()}
          </div>
          <div className="stat-label flex-row v-center gap-1">Total Individuals</div>
        </div>
        <div className="glass-card stat-widget hover:bg-[var(--glass-bg)]/60 transition-colors group">
          <div className="stat-value group-hover:text-[var(--accent)] transition-colors">
            {stats.totalPeople > 0 ? Math.round(stats.totalMentions / stats.totalPeople) : 0}
          </div>
          <div className="stat-label">Avg Mentions</div>
        </div>
        <div className="glass-card stat-widget hover:bg-[var(--glass-bg)]/60 transition-colors group">
          <div className="stat-value group-hover:text-purple-400 transition-colors">
            {stats.uniqueRoles.toLocaleString()}
          </div>
          <div className="stat-label">Unique Roles</div>
        </div>
        <div className="glass-card stat-widget hover:bg-[var(--glass-bg)]/60 transition-colors group">
          <div className="stat-value group-hover:text-pink-400 transition-colors">
            {(() => {
              const source = people.length > 0 ? people : analyticsData?.topConnectedEntities || [];
              if (source.length === 0) return '0';
              return Math.max(
                ...(source as EntityRecord[]).map((p) => Number(p?.mentions || 0)),
              ).toLocaleString();
            })()}
          </div>
          <div className="stat-label">Max Mentions</div>
        </div>
      </div>
    </div>
  );
};
