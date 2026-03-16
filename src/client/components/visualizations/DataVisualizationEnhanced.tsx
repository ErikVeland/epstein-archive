import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ResponsiveContainer,
  Treemap,
} from 'recharts';
import { Person } from '../../types';

interface DataVisualizationProps {
  people: Person[];
}

const COLORS = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  accent: '#06b6d4',
  danger: '#dc2626',
  warning: '#d97706',
  success: '#059669',
};

// Animated counter component
const AnimatedCounter: React.FC<{
  value: number;
  label: string;
  color: string;
  icon: React.ReactNode;
}> = ({ value, label, color, icon }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const stepValue = value / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setDisplayValue(Math.min(Math.floor(currentStep * stepValue), value));

      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <div
      className={`bg-gradient-to-br ${color} p-6 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 glow-cyan`}
    >
      <div className="flex items-center justify-between mb-4">
        {icon}
        <div className="text-3xl font-bold text-white">{displayValue.toLocaleString()}</div>
      </div>
      <div className="text-white opacity-90 text-sm font-medium">{label}</div>
    </div>
  );
};

// Custom tooltip with enhanced styling - moved outside component to avoid recreation
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/95 backdrop-blur-sm p-4 rounded-xl shadow-2xl border border-gray-600">
        <p className="text-white font-bold text-lg mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
            <span className="text-gray-300">
              {entry.name}:{' '}
              <span className="font-bold text-white">{entry.value.toLocaleString()}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const DataVisualization: React.FC<DataVisualizationProps> = ({ people }) => {
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    setAnimationKey((prev) => prev + 1);
  }, [people]);

  // Enhanced data preparation with more insights
  const likelihoodData = [
    {
      name: 'HIGH RISK',
      value: people.filter((p) => p.likelihoodScore === 'HIGH').length,
      color: COLORS.HIGH,
      description: 'Extensively mentioned with significant evidence',
    },
    {
      name: 'MEDIUM RISK',
      value: people.filter((p) => p.likelihoodScore === 'MEDIUM').length,
      color: COLORS.MEDIUM,
      description: 'Regularly mentioned with moderate evidence',
    },
    {
      name: 'LOW RISK',
      value: people.filter((p) => p.likelihoodScore === 'LOW').length,
      color: COLORS.LOW,
      description: 'Occasionally mentioned with limited evidence',
    },
  ];

  const topMentions = people
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 15)
    .map((person) => ({
      name: person.name.length > 25 ? person.name.substring(0, 25) + '...' : person.name,
      mentions: person.mentions,
      level: person.likelihoodScore,
      role: person.evidenceTypes?.[0] || 'Unknown',
    }));

  // Role distribution with enhanced data
  const roleData = people
    .reduce(
      (acc, person) => {
        const role = person.evidenceTypes?.[0] || 'Unknown';
        const existing = acc.find((item) => item.name === role);
        if (existing) {
          existing.count += 1;
          existing.totalMentions += person.mentions;
          existing.avgMentions = Math.round(existing.totalMentions / existing.count);
        } else {
          acc.push({
            name: role,
            count: 1,
            totalMentions: person.mentions,
            avgMentions: person.mentions,
          });
        }
        return acc;
      },
      [] as { name: string; count: number; totalMentions: number; avgMentions: number }[],
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Status distribution
  const statusData = people.reduce(
    (acc, person) => {
      const status = person.likelihoodScore || 'Unknown';
      const existing = acc.find((item) => item.name === status);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ name: status, count: 1 });
      }
      return acc;
    },
    [] as { name: string; count: number }[],
  );

  // Mention intensity distribution
  const mentionRanges = [
    { range: '1-10', min: 1, max: 10 },
    { range: '11-50', min: 11, max: 50 },
    { range: '51-100', min: 51, max: 100 },
    { range: '101-500', min: 101, max: 500 },
    { range: '501-1000', min: 501, max: 1000 },
    { range: '1000+', min: 1001, max: Infinity },
  ];

  const mentionDistribution = mentionRanges.map((range) => ({
    range: range.range,
    count: people.filter((p) => p.mentions >= range.min && p.mentions <= range.max).length,
  }));

  // Enhanced treemap data with categories
  const treemapData = people.slice(0, 50).map((person) => ({
    name: person.name,
    size: person.mentions,
    level: person.likelihoodScore,
    role: person.evidenceTypes?.[0] || 'Unknown',
  }));

  return (
    <div className="space-y-8" key={animationKey}>
      {/* Animated Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <AnimatedCounter
          value={people.filter((p) => p.likelihoodScore === 'HIGH').length}
          label="High Risk Individuals"
          color="from-red-600 to-red-800"
          icon={<span className="text-red-300 text-2xl">⚠️</span>}
        />
        <AnimatedCounter
          value={people.filter((p) => p.likelihoodScore === 'MEDIUM').length}
          label="Medium Risk Individuals"
          color="from-yellow-600 to-orange-600"
          icon={<span className="text-yellow-300 text-2xl">⚡</span>}
        />
        <AnimatedCounter
          value={people.filter((p) => p.likelihoodScore === 'LOW').length}
          label="Low Risk Individuals"
          color="from-green-600 to-emerald-600"
          icon={<span className="text-green-300 text-2xl">✓</span>}
        />
        <AnimatedCounter
          value={people.reduce((sum, p) => sum + p.mentions, 0)}
          label="Total Mentions"
          color="from-blue-600 to-purple-600"
          icon={<span className="text-blue-300 text-2xl">📊</span>}
        />
      </div>

      {/* Enhanced Top Row - Likelihood Distribution with 3D Effect */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-700">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center space-x-3">
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500 to-orange-500"></div>
            <span>Risk Level Distribution</span>
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={likelihoodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={2000}
                >
                  {likelihoodData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="#1f2937"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={CustomTooltip} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-white font-medium">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Risk Level Descriptions */}
          <div className="mt-6 space-y-2">
            {likelihoodData.map((item, index) => (
              <div key={index} className="flex items-center space-x-3 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-gray-300">{item.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Distribution with Enhanced Styling */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-700">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center space-x-3">
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
            <span>Current Status Distribution</span>
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis
                  dataKey="name"
                  stroke="#9ca3af"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip content={CustomTooltip} />
                <Bar
                  dataKey="count"
                  fill="url(#statusGradient)"
                  radius={[8, 8, 0, 0]}
                  animationDuration={2000}
                >
                  <defs>
                    <linearGradient id="statusGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Enhanced Top Mentions Chart with Horizontal Layout */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-700">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center space-x-3">
          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"></div>
          <span>Top 15 Most Mentioned Individuals</span>
        </h3>
        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topMentions}
              layout="horizontal"
              margin={{ top: 20, right: 30, left: 120, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis type="number" stroke="#9ca3af" fontSize={12} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#9ca3af"
                width={120}
                fontSize={11}
                tick={{ fill: '#9ca3af' }}
              />
              <Tooltip content={CustomTooltip} />
              <Bar dataKey="mentions" radius={[0, 8, 8, 0]} animationDuration={2500}>
                {topMentions.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.level === 'HIGH'
                        ? 'url(#highRiskGradient)'
                        : entry.level === 'MEDIUM'
                          ? 'url(#mediumRiskGradient)'
                          : 'url(#lowRiskGradient)'
                    }
                  />
                ))}
                <defs>
                  <linearGradient id="highRiskGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#dc2626" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                  <linearGradient id="mediumRiskGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#d97706" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <linearGradient id="lowRiskGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend for risk levels */}
        <div className="mt-6 flex justify-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-gradient-to-r from-red-500 to-red-600"></div>
            <span className="text-gray-300 text-sm">High Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-gradient-to-r from-yellow-500 to-orange-500"></div>
            <span className="text-gray-300 text-sm">Medium Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-gradient-to-r from-green-500 to-emerald-500"></div>
            <span className="text-gray-300 text-sm">Low Risk</span>
          </div>
        </div>
      </div>

      {/* Role Distribution with Enhanced Visualization */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-700">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center space-x-3">
          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
          <span>Role Distribution Analysis</span>
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={roleData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="name"
                stroke="#9ca3af"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip content={CustomTooltip} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="url(#roleGradient)"
                fill="url(#roleGradient)"
                fillOpacity={0.6}
                animationDuration={2000}
              />
              <defs>
                <linearGradient id="roleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mention Intensity Distribution */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-700">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center space-x-3">
          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"></div>
          <span>Mention Intensity Distribution</span>
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={mentionDistribution}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="range" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip content={CustomTooltip} />
              <Bar
                dataKey="count"
                fill="url(#intensityGradient)"
                radius={[6, 6, 0, 0]}
                animationDuration={2000}
              >
                <defs>
                  <linearGradient id="intensityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Enhanced Treemap Visualization */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-700">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center space-x-3">
          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"></div>
          <span>Top 50 Individuals by Mentions (Interactive Treemap)</span>
        </h3>
        <div className="h-[600px]">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={treemapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#1f2937"
              animationDuration={2000}
              content={
                (({ x, y, width, height, index, name, size, level }: any) => {
                  const fontSize = Math.min(width / 8, height / 4, 14);
                  const textColor =
                    level === 'HIGH'
                      ? 'text-red-100'
                      : level === 'MEDIUM'
                        ? 'text-yellow-100'
                        : 'text-green-100';

                  return (
                    <g>
                      <defs>
                        <linearGradient id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                          <stop
                            offset="0%"
                            stopColor={
                              level === 'HIGH'
                                ? '#dc2626'
                                : level === 'MEDIUM'
                                  ? '#d97706'
                                  : '#059669'
                            }
                          />
                          <stop
                            offset="100%"
                            stopColor={
                              level === 'HIGH'
                                ? '#ef4444'
                                : level === 'MEDIUM'
                                  ? '#f59e0b'
                                  : '#10b981'
                            }
                          />
                        </linearGradient>
                      </defs>
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={`url(#gradient-${index})`}
                        stroke="#1f2937"
                        strokeWidth={2}
                        rx={8}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                      />
                      {width > 60 && height > 40 && (
                        <>
                          <text
                            x={x + width / 2}
                            y={y + height / 2 - fontSize / 2}
                            textAnchor="middle"
                            className={`${textColor} font-bold`}
                            fontSize={fontSize}
                            fill="currentColor"
                          >
                            {name.length > 12 ? name.substring(0, 12) + '...' : name}
                          </text>
                          <text
                            x={x + width / 2}
                            y={y + height / 2 + fontSize / 2}
                            textAnchor="middle"
                            className={`${textColor}`}
                            fontSize={fontSize * 0.8}
                            fill="currentColor"
                          >
                            {size.toLocaleString()}
                          </text>
                        </>
                      )}
                    </g>
                  );
                }) as any
              }
            />
          </ResponsiveContainer>
        </div>

        {/* Treemap Legend */}
        <div className="mt-6 flex justify-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-gradient-to-r from-red-600 to-red-700"></div>
            <span className="text-gray-300 text-sm">High Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-gradient-to-r from-yellow-600 to-orange-600"></div>
            <span className="text-gray-300 text-sm">Medium Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-gradient-to-r from-green-600 to-emerald-600"></div>
            <span className="text-gray-300 text-sm">Low Risk</span>
          </div>
        </div>
      </div>

      {/* Summary Statistics with Enhanced Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 p-6 rounded-2xl shadow-2xl border border-purple-700">
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl font-bold text-white">{people.length.toLocaleString()}</div>
            <div className="text-purple-300 text-2xl">👥</div>
          </div>
          <div className="text-purple-200 text-sm font-medium">Total Individuals</div>
          <div className="mt-2 text-xs text-purple-300 opacity-75">Across all evidence files</div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-900 p-6 rounded-2xl shadow-2xl border border-indigo-700">
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl font-bold text-white">
              {Math.round(people.reduce((sum, p) => sum + p.mentions, 0) / people.length)}
            </div>
            <div className="text-indigo-300 text-2xl">📈</div>
          </div>
          <div className="text-indigo-200 text-sm font-medium">Avg Mentions</div>
          <div className="mt-2 text-xs text-indigo-300 opacity-75">Per individual</div>
        </div>

        <div className="bg-gradient-to-br from-pink-900 via-pink-800 to-pink-900 p-6 rounded-2xl shadow-2xl border border-pink-700">
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl font-bold text-white">{roleData.length}</div>
            <div className="text-pink-300 text-2xl">🎭</div>
          </div>
          <div className="text-pink-200 text-sm font-medium">Unique Roles</div>
          <div className="mt-2 text-xs text-pink-300 opacity-75">Across all individuals</div>
        </div>

        <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-teal-900 p-6 rounded-2xl shadow-2xl border border-teal-700">
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl font-bold text-white">
              {Math.max(...people.map((p) => p.mentions)).toLocaleString()}
            </div>
            <div className="text-teal-300 text-2xl">🔥</div>
          </div>
          <div className="text-teal-200 text-sm font-medium">Max Mentions</div>
          <div className="mt-2 text-xs text-teal-300 opacity-75">Single individual</div>
        </div>
      </div>
    </div>
  );
};
