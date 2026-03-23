import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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
      <div className="bg-[var(--glass-bg-strong)]/95 backdrop-blur-md p-4 rounded-[var(--radius-xl)] shadow-[var(--glass-shadow)] border border-[var(--glass-border)]">
        <p className="text-[var(--text-primary)] font-bold text-lg mb-2">
          {formatLabel(data.type)}
        </p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-[var(--text-muted)]">Documents:</span>
            <span className="text-[var(--text-primary)] font-mono font-bold">
              {data.count.toLocaleString()}
            </span>
          </div>
          {(data.redacted ?? 0) > 0 && (
            <div className="flex justify-between gap-4">
              <span className="text-[var(--text-muted)]">Redacted:</span>
              <span className="text-[var(--accent-warning)] font-mono">
                {(data.redacted ?? 0).toLocaleString()} ({redactedPercent}%)
              </span>
            </div>
          )}
          {data.avgRisk && (
            <div className="flex justify-between gap-4">
              <span className="text-[var(--text-muted)]">Avg Risk:</span>
              <span
                className={`font-mono ${data.avgRisk >= 4 ? 'text-[var(--accent-danger)]' : data.avgRisk >= 2 ? 'text-[var(--accent-warning)]' : 'text-[var(--accent-success)]'}`}
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
      className="text-xs font-semibold drop-shadow-[var(--glass-shadow)]"
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
    <div className="flex flex-col w-full h-[500px]">
      <div className="flex-1 min-h-0 relative">
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
              className="cursor-pointer"
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
                  className="hover:opacity-80 transition-opacity"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center stats overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-4xl font-bold text-[var(--text-primary)] drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            {total.toLocaleString()}
          </span>
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1 font-semibold">
            Total Files
          </span>
        </div>
      </div>

      {/* Legend below */}
      <div className="flex-none flex flex-wrap justify-center gap-2 px-4 py-2 mt-2 max-h-[100px] overflow-y-auto custom-scrollbar">
        {chartData.map((item, index) => (
          <button
            key={item.type}
            onClick={() => onSegmentClick?.(item.type)}
            className="flex items-center gap-2 px-2 py-1 bg-[var(--glass-bg)]/50 hover:bg-[var(--glass-bg-highlight)]/50 rounded-full border border-[var(--glass-border)] transition-all hover:scale-105 shrink-0 max-w-[150px]"
            title={`${formatLabel(item.type)}: ${item.count.toLocaleString()}`}
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: COLORS[index % COLORS.length].main,
                boxShadow: `0 0 8px ${COLORS[index % COLORS.length].shadow}`,
              }}
            />
            <span className="text-[10px] text-[var(--text-secondary)] font-medium truncate">
              {formatLabel(item.type)}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0">
              {item.count.toLocaleString()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SunburstChart;
