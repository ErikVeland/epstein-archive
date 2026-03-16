import React, { useState, useEffect, useMemo } from 'react';
import { Info, Users, AlertTriangle, Activity, ShieldAlert } from 'lucide-react';
import { Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Person } from '../../types';
import { TreeMap } from './TreeMap';
import { filterPeopleOnly, isJunkEntity } from '../../utils/entityFilters';

interface DataVisualizationProps {
  people?: Person[];
  analyticsData?: any;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onPersonSelect?: (person: Person) => void;
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-slate-700/50">
        <p className="text-white font-bold mb-2 text-sm">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-3 text-sm">
            <div
              className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            <span className="text-slate-300 font-medium">{entry.name}:</span>
            <span className="text-white font-mono font-bold">{entry.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const DataVisualization: React.FC<DataVisualizationProps> = ({
  people = [],
  analyticsData,
  loading,
  error,
  onRetry,
  onPersonSelect,
}) => {
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
        highRisk:
          analyticsData.likelihoodDistribution?.find((d: any) => d.level === 'HIGH')?.count || 0,
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
        .filter((d: any) => Number(d.rating) >= 4)
        .reduce((acc: number, curr: any) => acc + Number(curr.count || 0), 0);
      const medium = analyticsData.redFlagDistribution
        .filter((d: any) => Number(d.rating) >= 2 && Number(d.rating) < 4)
        .reduce((acc: number, curr: any) => acc + Number(curr.count || 0), 0);
      const low = analyticsData.redFlagDistribution
        .filter((d: any) => Number(d.rating) < 2)
        .reduce((acc: number, curr: any) => acc + Number(curr.count || 0), 0);

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
        analyticsData.likelihoodDistribution.map((d: any) => [
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
        .filter((d: any) => Number(d.riskLevel) >= 4)
        .reduce((acc: number, curr: any) => acc + curr.count, 0);
      const medium = analyticsData.riskByType
        .filter((d: any) => Number(d.riskLevel) >= 2 && Number(d.riskLevel) < 4)
        .reduce((acc: number, curr: any) => acc + curr.count, 0);
      const low = analyticsData.riskByType
        .filter((d: any) => Number(d.riskLevel) < 2)
        .reduce((acc: number, curr: any) => acc + curr.count, 0);

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

    return source
      .map((p: any) => ({
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
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-400 glass-panel rounded-xl">
        <AlertTriangle className="mx-auto h-12 w-12 mb-4 opacity-80" />
        <p className="text-lg mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 border border-slate-600 transition-all hover:scale-105"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Entities Bar Chart - Enhanced */}
        <div className="glass-card p-6 rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="h-24 w-24 text-cyan-500" />
          </div>

          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 flex-wrap relative z-10">
            <Users className="h-5 w-5 text-cyan-400" />
            <span className="neon-text-cyan">Top Mentioned Individuals</span>
          </h3>

          {/* Microcopy for Top Entities Chart */}
          <div className="text-xs text-slate-400 mb-6 flex items-start gap-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 backdrop-blur-sm relative z-10">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-cyan-400" />
            <span>
              Individuals with the highest frequency of appearances across all analyzed documents.
              Colors indicate risk level. Click to view details.
            </span>
          </div>

          <div className="h-[400px] relative z-10 overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {topEntities.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No non-junk person entities with mentions available.
              </div>
            ) : (
              topEntities.map((entry: any, index: number) => {
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
                    ? 'text-fuchsia-300 border-fuchsia-500/40 bg-fuchsia-900/30'
                    : risk >= 4
                      ? 'text-red-300 border-red-500/40 bg-red-900/30'
                      : risk >= 3
                        ? 'text-amber-300 border-amber-500/40 bg-amber-900/30'
                        : risk >= 2
                          ? 'text-cyan-300 border-cyan-500/40 bg-cyan-900/30'
                          : 'text-emerald-300 border-emerald-500/40 bg-emerald-900/30';

                return (
                  <button
                    key={`${entry.name}-${index}`}
                    type="button"
                    onClick={() => onPersonSelect && onPersonSelect(entry.person)}
                    className="w-full text-left rounded-lg border border-slate-700/60 bg-slate-900/45 hover:bg-slate-800/70 hover:border-cyan-500/40 transition-colors p-3"
                  >
                    <div className="grid grid-cols-[40px_minmax(0,1fr)_120px] items-center gap-3">
                      <div className="w-10 h-10 rounded-md border border-amber-500/40 bg-gradient-to-b from-amber-900/50 to-slate-900/70 flex items-center justify-center font-bold text-amber-200">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-slate-100 font-semibold truncate">{entry.name}</div>
                        <div className="mt-2 h-2.5 rounded bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 via-cyan-400 to-blue-500"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-100 font-mono text-sm">
                          {entry.mentions.toLocaleString()}
                        </div>
                        <div
                          className={`inline-flex mt-1 px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider ${riskColor}`}
                        >
                          {riskLabel}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Risk Distribution Pie Chart */}
        <div className="glass-card p-6 rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldAlert className="h-24 w-24 text-orange-500" />
          </div>

          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 relative z-10">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            <span>Risk Level Distribution</span>
          </h3>
          {/* Microcopy for Risk Distribution Chart */}
          <div className="text-xs text-slate-400 mb-6 flex items-start gap-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 backdrop-blur-sm relative z-10">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-400" />
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
              <span className="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                {stats.totalPeople.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 uppercase tracking-wider mt-1 font-semibold">
                Entities
              </span>
            </div>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-4 relative z-10">
            {riskDistribution.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-1 bg-slate-900/40 rounded-full border border-slate-700/30"
              >
                <div
                  className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-slate-300 font-medium">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Tree Map */}
      <div className="glass-card p-6 rounded-xl shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 relative z-10">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-400" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              Interactive Entity Map
            </span>
          </h3>
          <span className="text-xs font-medium px-3 py-1 bg-purple-500/10 text-purple-300 rounded-full border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
            Top 50 by Mentions
          </span>
        </div>

        {/* Microcopy for Tree Map */}
        <div className="text-xs text-slate-400 mb-6 flex items-start gap-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 backdrop-blur-sm relative z-10">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-400" />
          <span>
            Visual representation of entity prominence. Box size correlates to mention frequency.
            Click any box to view detailed evidence.
          </span>
        </div>

        <div className="relative z-10">
          <TreeMap
            people={topEntities.map((entry: any) => ({
              ...(entry.person || {}),
              name: entry.name,
              fullName: entry.name,
              mentions: entry.mentions,
              redFlagRating: entry.redFlagRating,
              entityType: entry.entityType,
              junkTier: entry.junkTier,
              junkFlag: entry.junkFlag,
            }))}
            onPersonClick={onPersonSelect}
          />
        </div>
      </div>

      {/* Summary Statistics Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl hover:bg-slate-800/60 transition-colors group">
          <div className="text-3xl font-bold text-white font-mono group-hover:text-cyan-400 transition-colors">
            {stats.totalPeople.toLocaleString()}
          </div>
          <div className="text-slate-400 text-xs mt-1 font-medium uppercase tracking-wide flex items-center gap-1">
            Total Individuals
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl hover:bg-slate-800/60 transition-colors group">
          <div className="text-3xl font-bold text-white font-mono group-hover:text-blue-400 transition-colors">
            {stats.totalPeople > 0 ? Math.round(stats.totalMentions / stats.totalPeople) : 0}
          </div>
          <div className="text-slate-400 text-xs mt-1 font-medium uppercase tracking-wide">
            Avg Mentions
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl hover:bg-slate-800/60 transition-colors group">
          <div className="text-3xl font-bold text-white font-mono group-hover:text-purple-400 transition-colors">
            {stats.uniqueRoles.toLocaleString()}
          </div>
          <div className="text-slate-400 text-xs mt-1 font-medium uppercase tracking-wide">
            Unique Roles
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl hover:bg-slate-800/60 transition-colors group">
          <div className="text-3xl font-bold text-white font-mono group-hover:text-pink-400 transition-colors">
            {(() => {
              const source = people.length > 0 ? people : analyticsData?.topConnectedEntities || [];
              if (source.length === 0) return '0';
              return Math.max(...source.map((p: any) => p?.mentions || 0)).toLocaleString();
            })()}
          </div>
          <div className="text-slate-400 text-xs mt-1 font-medium uppercase tracking-wide">
            Max Mentions
          </div>
        </div>
      </div>
    </div>
  );
};
