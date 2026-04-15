import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from '../../design-system/lib';
import styles from './SunburstChart.module.css';

interface SunburstChartProps {
  data: Array<{
    type: string;
    count: number;
    redacted?: number;
    avgRisk?: number;
  }>;
  onSegmentClick?: (type: string) => void;
}

// Beautiful gradient color palette
const COLORS = [
  { main: '#06b6d4', shadow: 'rgba(6, 182, 212, 0.3)' }, // Cyan
  { main: '#8b5cf6', shadow: 'rgba(139, 92, 246, 0.3)' }, // Purple
  { main: '#f59e0b', shadow: 'rgba(245, 158, 11, 0.3)' }, // Amber
  { main: '#10b981', shadow: 'rgba(16, 185, 129, 0.3)' }, // Emerald
  { main: '#ef4444', shadow: 'rgba(239, 68, 68, 0.3)' }, // Red
  { main: '#3b82f6', shadow: 'rgba(59, 130, 246, 0.3)' }, // Blue
  { main: '#ec4899', shadow: 'rgba(236, 72, 153, 0.3)' }, // Pink
  { main: '#14b8a6', shadow: 'rgba(20, 184, 166, 0.3)' }, // Teal
];

// Format type labels nicely
const formatLabel = (type: string): string => {
  if (!type) return 'Unknown';
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};

interface SunburstTooltipPayload {
  payload: {
    type: string;
    count: number;
    redacted?: number;
    avgRisk?: number;
  };
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: SunburstTooltipPayload[];
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const redactedPercent =
      data.redacted && data.count ? Math.round((data.redacted / data.count) * 100) : 0;

    return (
      <div className={styles.tooltip}>
        <p className={styles.tooltipTitle}>{formatLabel(data.type)}</p>
        <div className={styles.tooltipBody}>
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipLabel}>Documents:</span>
            <span className={styles.tooltipValue}>{data.count.toLocaleString()}</span>
          </div>
          {(data.redacted ?? 0) > 0 && (
            <div className={styles.tooltipRow}>
              <span className={styles.tooltipLabel}>Redacted:</span>
              <span className={styles.warningValue}>
                {(data.redacted ?? 0).toLocaleString()} ({redactedPercent}%)
              </span>
            </div>
          )}
          {data.avgRisk && (
            <div className={styles.tooltipRow}>
              <span className={styles.tooltipLabel}>Avg Risk:</span>
              <span
                className={`${styles.riskValue} ${
                  data.avgRisk >= 4
                    ? styles.riskValueHigh
                    : data.avgRisk >= 2
                      ? styles.riskValueMedium
                      : styles.riskValueLow
                }`}
              >
                {'🚩'.repeat(Math.round(data.avgRisk))}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const CustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  type,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  type: string;
}) => {
  if (percent < 0.05) return null; // Don't show labels for tiny slices

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className={styles.chartLabel}
    >
      {formatLabel(type)}
    </text>
  );
};

export const SunburstChart: React.FC<SunburstChartProps> = ({ data, onSegmentClick }) => {
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      percentage: 0, // Will be calculated by recharts
      color: COLORS[index % COLORS.length].main,
    }));
  }, [data]);

  const total = useMemo(() => data.reduce((sum, d) => sum + d.count, 0), [data]);

  return (
    <div className={styles.chartShell}>
      <div className={styles.chartStage}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {COLORS.map((color, i) => (
                <linearGradient
                  key={`grad-${i}`}
                  id={`sunburstGrad-${i}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop offset="0%" stopColor={color.main} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={color.main} stopOpacity={1} />
                </linearGradient>
              ))}
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={160}
              paddingAngle={2}
              dataKey="count"
              nameKey="type"
              label={CustomLabel}
              labelLine={false}
              onClick={(data) => onSegmentClick?.(data.type)}
              className={styles.pieCursor}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {chartData.map((_entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#sunburstGrad-${index % COLORS.length})`}
                  stroke={COLORS[index % COLORS.length].main}
                  strokeWidth={1}
                  style={{ filter: 'url(#glow)' }}
                  className={styles.sliceCell}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center stats overlay */}
        <div className={styles.centerOverlay}>
          <span className={styles.centerValue}>{total.toLocaleString()}</span>
          <span className={styles.centerLabel}>Total Files</span>
        </div>
      </div>

      {/* Legend below */}
      <div className={styles.legend}>
        {chartData.map((item, index) => (
          <Button
            key={item.type}
            variant="ghost"
            size="sm"
            onClick={() => onSegmentClick?.(item.type)}
            className={styles.legendChip}
            title={`${formatLabel(item.type)}: ${item.count.toLocaleString()}`}
          >
            <div
              className={styles.legendDot}
              style={{
                backgroundColor: COLORS[index % COLORS.length].main,
                boxShadow: `0 0 8px ${COLORS[index % COLORS.length].shadow}`,
              }}
            />
            <span className={styles.legendLabel}>{formatLabel(item.type)}</span>
            <span className={styles.legendCount}>{item.count.toLocaleString()}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default SunburstChart;
