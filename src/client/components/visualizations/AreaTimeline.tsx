import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface TimelineDataPoint {
  period: string;
  total: number;
  emails?: number;
  photos?: number;
  documents?: number;
  financial?: number;
}

interface AreaTimelineProps {
  data: TimelineDataPoint[];
  onPeriodClick?: (period: string) => void;
}

const AREA_COLORS = {
  emails: { fill: '#06b6d4', stroke: '#06b6d4' }, // Cyan
  photos: { fill: '#8b5cf6', stroke: '#8b5cf6' }, // Purple
  documents: { fill: '#f59e0b', stroke: '#f59e0b' }, // Amber
  financial: { fill: '#ef4444', stroke: '#ef4444' }, // Red
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);

    return (
      <div className="bg-[var(--glass-bg-strong)] backdrop-blur-md p-4 rounded-[var(--radius-xl)] shadow-[var(--glass-shadow)] border border-[var(--glass-border)] min-w-[180px]">
        <p className="text-[var(--text-primary)] font-bold text-sm mb-3 border-b border-[var(--glass-border)] pb-2">
          {label}
        </p>
        <div className="space-y-2">
          {payload.map(
            (entry: any, index: number) =>
              entry.value > 0 && (
                <div key={index} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-[var(--text-secondary)] text-xs capitalize">
                      {entry.name}
                    </span>
                  </div>
                  <span className="text-[var(--text-primary)] font-mono text-xs font-bold">
                    {entry.value.toLocaleString()}
                  </span>
                </div>
              ),
          )}
        </div>
        <div className="mt-3 pt-2 border-t border-[var(--glass-border)] flex justify-between">
          <span className="text-[var(--text-muted)] text-xs">Total</span>
          <span className="text-[var(--accent)] font-mono text-sm font-bold">
            {total.toLocaleString()}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export const AreaTimeline: React.FC<AreaTimelineProps> = ({ data, onPeriodClick }) => {
  // Process and sort data by period
  const chartData = useMemo(() => {
    return data
      .filter((d) => d.period === 'Unknown' || (d.period && d.period.length >= 7))
      .map((d) => ({
        ...d,
        // Format period for display (YYYY-MM -> MMM YYYY, Unknown -> Unknown)
        displayPeriod: formatPeriod(d.period),
      }))
      .sort((a, b) => {
        if (a.period === 'Unknown') return 1;
        if (b.period === 'Unknown') return -1;
        return a.period.localeCompare(b.period);
      });
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-[var(--text-muted)]">
        No timeline data available
      </div>
    );
  }

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          onClick={(data) => {
            if (data?.activePayload?.[0]?.payload?.period) {
              onPeriodClick?.(data.activePayload[0].payload.period);
            }
          }}
        >
          <defs>
            {Object.entries(AREA_COLORS).map(([key, colors]) => (
              <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.fill} stopOpacity={0.4} />
                <stop offset="95%" stopColor={colors.fill} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--glass-border)"
            vertical={false}
            opacity={0.6}
          />
          <XAxis
            dataKey="displayPeriod"
            stroke="var(--text-muted)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--text-secondary)' }}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="var(--text-muted)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--text-secondary)' }}
            tickFormatter={(value) => (value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => (
              <span className="text-[var(--text-secondary)] text-xs capitalize">{value}</span>
            )}
          />
          <Area
            type="monotone"
            dataKey="emails"
            name="emails"
            stackId="1"
            stroke={AREA_COLORS.emails.stroke}
            fill={`url(#gradient-emails)`}
            strokeWidth={2}
            animationDuration={1000}
          />
          <Area
            type="monotone"
            dataKey="photos"
            name="photos"
            stackId="1"
            stroke={AREA_COLORS.photos.stroke}
            fill={`url(#gradient-photos)`}
            strokeWidth={2}
            animationDuration={1000}
          />
          <Area
            type="monotone"
            dataKey="documents"
            name="documents"
            stackId="1"
            stroke={AREA_COLORS.documents.stroke}
            fill={`url(#gradient-documents)`}
            strokeWidth={2}
            animationDuration={1000}
          />
          <Area
            type="monotone"
            dataKey="financial"
            name="financial"
            stackId="1"
            stroke={AREA_COLORS.financial.stroke}
            fill={`url(#gradient-financial)`}
            strokeWidth={2}
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Format period from YYYY-MM to MMM 'YY
function formatPeriod(period: string): string {
  if (period === 'Unknown') return 'Unknown Date';
  if (!period || period.length < 5) return period;

  // Handle both hyphen and slash separators
  const separator = period.includes('/') ? '/' : '-';
  const parts = period.split(separator);

  if (parts.length < 2) return period;

  const [year, month] = parts;
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const monthName = months[parseInt(month, 10) - 1] || month;

  // Handle 2-digit or 4-digit years
  const shortYear = year.length === 4 ? year.slice(2) : year;

  return `${monthName} '${shortYear}`;
}

export default AreaTimeline;
