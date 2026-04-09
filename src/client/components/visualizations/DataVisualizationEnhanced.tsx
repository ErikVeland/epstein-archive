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
  type TooltipProps,
} from 'recharts';
import { Person } from '../../types';
import styles from './DataVisualizationEnhanced.module.css';

interface DataVisualizationProps {
  people: Person[];
}

interface TreemapContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  name?: string;
  size?: number;
  level?: string;
}

const COLORS = {
  HIGH: 'var(--risk-critical)',
  MEDIUM: 'var(--risk-medium)',
  LOW: 'var(--risk-low)',
  primary: 'var(--accent)',
  secondary: 'var(--nav-blackbook)',
  accent: 'var(--accent-info)',
  danger: 'var(--accent-danger)',
  warning: 'var(--accent-warning)',
  success: 'var(--accent-success)',
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
    <div className={`${styles.counterCard} ${color}`}>
      <div className={styles.counterHeader}>
        {icon}
        <div className={styles.counterValue}>{displayValue.toLocaleString()}</div>
      </div>
      <div className={styles.counterLabel}>{label}</div>
    </div>
  );
};

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.tooltip}>
        <p className={styles.tooltipTitle}>{String(label ?? '')}</p>
        {payload.map((entry, index) => (
          <div key={index} className={styles.tooltipRow}>
            <div
              className={styles.tooltipDot}
              style={{ backgroundColor: typeof entry.color === 'string' ? entry.color : undefined }}
            />
            <span className={styles.tooltipText}>
              {String(entry.name || 'value')}:{' '}
              <span className={styles.tooltipValue}>
                {typeof entry.value === 'number'
                  ? entry.value.toLocaleString()
                  : String(entry.value ?? '')}
              </span>
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const TreemapCellContent: React.FC<TreemapContentProps> = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  index = 0,
  name = '',
  size = 0,
  level = 'LOW',
}) => {
  const fontSize = Math.min(width / 8, height / 4, 14);
  const textColor = level === 'HIGH' ? '#fee2e2' : level === 'MEDIUM' ? '#fef3c7' : '#dcfce7';

  return (
    <g>
      <defs>
        <linearGradient id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
          <stop
            offset="0%"
            stopColor={
              level === 'HIGH'
                ? 'var(--risk-critical)'
                : level === 'MEDIUM'
                  ? 'var(--risk-medium)'
                  : 'var(--risk-low)'
            }
          />
          <stop
            offset="100%"
            stopColor={
              level === 'HIGH'
                ? 'var(--accent-danger)'
                : level === 'MEDIUM'
                  ? 'var(--accent-warning)'
                  : 'var(--accent-success)'
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
        stroke="var(--bg-dark)"
        strokeWidth={2}
        rx={8}
      />
      {width > 60 && height > 40 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - fontSize / 2}
            textAnchor="middle"
            fontSize={fontSize}
            fontWeight="700"
            fill={textColor}
          >
            {name.length > 12 ? `${name.substring(0, 12)}...` : name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + fontSize / 2}
            textAnchor="middle"
            fontSize={fontSize * 0.8}
            fill={textColor}
          >
            {size.toLocaleString()}
          </text>
        </>
      )}
    </g>
  );
};

export const DataVisualization: React.FC<DataVisualizationProps> = ({ people }) => {
  const [animationKey, setAnimationKey] = useState(0);
  const [prevPeople, setPrevPeople] = useState(people);
  if (people !== prevPeople) {
    setPrevPeople(people);
    setAnimationKey((prev) => prev + 1);
  }

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
    <div className={styles.root} key={animationKey}>
      {/* Animated Header Stats */}
      <div className={styles.statsGrid}>
        <AnimatedCounter
          value={people.filter((p) => p.likelihoodScore === 'HIGH').length}
          label="High Risk Individuals"
          color={styles.counterRiskHigh}
          icon={<span className={styles.iconHigh}>⚠️</span>}
        />
        <AnimatedCounter
          value={people.filter((p) => p.likelihoodScore === 'MEDIUM').length}
          label="Medium Risk Individuals"
          color={styles.counterRiskMedium}
          icon={<span className={styles.iconMedium}>⚡</span>}
        />
        <AnimatedCounter
          value={people.filter((p) => p.likelihoodScore === 'LOW').length}
          label="Low Risk Individuals"
          color={styles.counterRiskLow}
          icon={<span className={styles.iconLow}>✓</span>}
        />
        <AnimatedCounter
          value={people.reduce((sum, p) => sum + p.mentions, 0)}
          label="Total Mentions"
          color={styles.counterPrimary}
          icon={<span className={styles.iconPrimary}>📊</span>}
        />
      </div>

      {/* Enhanced Top Row - Likelihood Distribution with 3D Effect */}
      <div className={styles.chartGrid}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>
            <div className={`${styles.titleDot} ${styles.dotRisk}`}></div>
            <span>Risk Level Distribution</span>
          </h3>
          <div className={styles.chartMedium}>
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
                      stroke="var(--bg-dark)"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className={styles.legendFormatter}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Risk Level Descriptions */}
          <div className={styles.descriptionList}>
            {likelihoodData.map((item, index) => (
              <div key={index} className={styles.descriptionItem}>
                <div
                  className={styles.descriptionDot}
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className={styles.descriptionText}>{item.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Distribution with Enhanced Styling */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>
            <div className={`${styles.titleDot} ${styles.dotStatus}`}></div>
            <span>Current Status Distribution</span>
          </h3>
          <div className={styles.chartMedium}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" opacity={0.3} />
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
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  fill="url(#statusGradient)"
                  radius={[8, 8, 0, 0]}
                  animationDuration={2000}
                >
                  <defs>
                    <linearGradient id="statusGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" />
                      <stop offset="100%" stopColor="var(--accent-emails)" />
                    </linearGradient>
                  </defs>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Enhanced Top Mentions Chart with Horizontal Layout */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>
          <div className={`${styles.titleDot} ${styles.dotMentions}`}></div>
          <span>Top 15 Most Mentioned Individuals</span>
        </h3>
        <div className={styles.chartTall}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topMentions}
              layout="horizontal"
              margin={{ top: 20, right: 30, left: 120, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" opacity={0.3} />
              <XAxis type="number" stroke="#9ca3af" fontSize={12} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#9ca3af"
                width={120}
                fontSize={11}
                tick={{ fill: '#9ca3af' }}
              />
              <Tooltip content={<CustomTooltip />} />
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
                    <stop offset="0%" stopColor="var(--risk-critical)" />
                    <stop offset="100%" stopColor="var(--accent-danger)" />
                  </linearGradient>
                  <linearGradient id="mediumRiskGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--risk-medium)" />
                    <stop offset="100%" stopColor="var(--accent-warning)" />
                  </linearGradient>
                  <linearGradient id="lowRiskGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--risk-low)" />
                    <stop offset="100%" stopColor="var(--accent-success)" />
                  </linearGradient>
                </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend for risk levels */}
        <div className={styles.legendRow}>
          <div className={styles.legendItem}>
            <div className={`${styles.legendSwatch} ${styles.riskHighGradient}`}></div>
            <span className={styles.legendText}>High Risk</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendSwatch} ${styles.riskMediumGradient}`}></div>
            <span className={styles.legendText}>Medium Risk</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendSwatch} ${styles.riskLowGradient}`}></div>
            <span className={styles.legendText}>Low Risk</span>
          </div>
        </div>
      </div>

      {/* Role Distribution with Enhanced Visualization */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>
          <div className={`${styles.titleDot} ${styles.dotRole}`}></div>
          <span>Role Distribution Analysis</span>
        </h3>
        <div className={styles.chartMedium}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={roleData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" opacity={0.3} />
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
              <Tooltip content={<CustomTooltip />} />
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
                  <stop offset="0%" stopColor="var(--accent-emails)" />
                  <stop offset="100%" stopColor="var(--nav-blackbook)" />
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mention Intensity Distribution */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>
          <div className={`${styles.titleDot} ${styles.dotIntensity}`}></div>
          <span>Mention Intensity Distribution</span>
        </h3>
        <div className={styles.chartMedium}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={mentionDistribution}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" opacity={0.3} />
              <XAxis dataKey="range" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="count"
                fill="url(#intensityGradient)"
                radius={[6, 6, 0, 0]}
                animationDuration={2000}
              >
                <defs>
                  <linearGradient id="intensityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-info)" />
                    <stop offset="100%" stopColor="var(--accent)" />
                  </linearGradient>
                </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Enhanced Treemap Visualization */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>
          <div className={`${styles.titleDot} ${styles.dotTreemap}`}></div>
          <span>Top 50 Individuals by Mentions (Interactive Treemap)</span>
        </h3>
        <div className={styles.chartTreemap}>
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={treemapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="var(--bg-dark)"
              animationDuration={2000}
              content={<TreemapCellContent />}
            />
          </ResponsiveContainer>
        </div>

        {/* Treemap Legend */}
        <div className={styles.legendRow}>
          <div className={styles.legendItem}>
            <div className={`${styles.legendSwatch} ${styles.treemapHighGradient}`}></div>
            <span className={styles.legendText}>High Risk</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendSwatch} ${styles.treemapMediumGradient}`}></div>
            <span className={styles.legendText}>Medium Risk</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendSwatch} ${styles.treemapLowGradient}`}></div>
            <span className={styles.legendText}>Low Risk</span>
          </div>
        </div>
      </div>

      {/* Summary Statistics with Enhanced Cards */}
      <div className={styles.summaryGrid}>
        <div className={`${styles.summaryCard} ${styles.summaryPurple}`}>
          <div className={styles.summaryHeader}>
            <div className={styles.summaryValue}>{people.length.toLocaleString()}</div>
            <div className={styles.summaryEmoji}>👥</div>
          </div>
          <div className={styles.summaryLabel}>Total Individuals</div>
          <div className={styles.summaryMeta}>Across all evidence files</div>
        </div>

        <div className={`${styles.summaryCard} ${styles.summaryIndigo}`}>
          <div className={styles.summaryHeader}>
            <div className={styles.summaryValue}>
              {Math.round(people.reduce((sum, p) => sum + p.mentions, 0) / people.length)}
            </div>
            <div className={styles.summaryEmoji}>📈</div>
          </div>
          <div className={styles.summaryLabel}>Avg Mentions</div>
          <div className={styles.summaryMeta}>Per individual</div>
        </div>

        <div className={`${styles.summaryCard} ${styles.summaryPink}`}>
          <div className={styles.summaryHeader}>
            <div className={styles.summaryValue}>{roleData.length}</div>
            <div className={styles.summaryEmoji}>🎭</div>
          </div>
          <div className={styles.summaryLabel}>Unique Roles</div>
          <div className={styles.summaryMeta}>Across all individuals</div>
        </div>

        <div className={`${styles.summaryCard} ${styles.summaryTeal}`}>
          <div className={styles.summaryHeader}>
            <div className={styles.summaryValue}>
              {Math.max(...people.map((p) => p.mentions)).toLocaleString()}
            </div>
            <div className={styles.summaryEmoji}>🔥</div>
          </div>
          <div className={styles.summaryLabel}>Max Mentions</div>
          <div className={styles.summaryMeta}>Single individual</div>
        </div>
      </div>
    </div>
  );
};
