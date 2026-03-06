import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceArea,
  Cell,
} from 'recharts';

interface TimelineDataPoint {
  period: string;
  total: number;
  emails?: number;
  photos?: number;
  documents?: number;
  sensitive?: number;
}

interface DocumentBarChartProps {
  data: TimelineDataPoint[];
  onPeriodClick?: (period: string) => void;
}

const BAR_COLORS = {
  emails: '#06b6d4', // Cyan
  photos: '#8b5cf6', // Purple
  documents: '#f59e0b', // Amber
  sensitive: '#ef4444', // Red
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);

    return (
      <div className="bg-slate-900/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-slate-700/50 min-w-[200px]">
        <p className="text-white font-bold text-sm mb-3 border-b border-slate-700 pb-2">{label}</p>
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
                    <span className="text-slate-300 text-xs capitalize">{entry.name}</span>
                  </div>
                  <span className="text-white font-mono text-xs font-bold">
                    {entry.value.toLocaleString()}
                  </span>
                </div>
              ),
          )}
        </div>
        <div className="mt-3 pt-2 border-t border-slate-700 flex justify-between">
          <span className="text-slate-400 text-xs">Total Documents</span>
          <span className="text-cyan-400 font-mono text-sm font-bold">
            {total.toLocaleString()}
          </span>
        </div>
        {label.includes('2001') && (
          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-400 leading-tight">
            Critical period: Possible data suppression/gaps identified around 9/11.
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const DocumentBarChart: React.FC<DocumentBarChartProps> = ({ data, onPeriodClick }) => {
  // Process and sort data by period, then aggregate by year for a readable long-range timeline.
  const chartData = useMemo(() => {
    const monthly = data
      .filter((d) => d.period === 'Unknown' || (d.period && d.period.length >= 7))
      .map((d) => ({
        ...d,
        period: d.period,
      }))
      .sort((a, b) => {
        if (a.period === 'Unknown') return 1;
        if (b.period === 'Unknown') return -1;
        return a.period.localeCompare(b.period);
      });

    const yearly = new Map<
      string,
      {
        period: string;
        displayPeriod: string;
        total: number;
        emails: number;
        photos: number;
        documents: number;
        sensitive: number;
      }
    >();

    for (const row of monthly) {
      if (row.period === 'Unknown') continue;
      const year = row.period.slice(0, 4);
      // Prioritize historical range the team expects to inspect.
      if (!/^\d{4}$/.test(year) || Number(year) < 1980 || Number(year) > 2026) continue;

      const existing = yearly.get(year) || {
        period: year,
        displayPeriod: year,
        total: 0,
        emails: 0,
        photos: 0,
        documents: 0,
        sensitive: 0,
      };

      existing.total += Number(row.total || 0);
      existing.emails += Number(row.emails || 0);
      existing.photos += Number(row.photos || 0);
      existing.documents += Number(row.documents || 0);
      existing.sensitive += Number(row.sensitive || 0);
      yearly.set(year, existing);
    }

    return Array.from(yearly.values()).sort((a, b) => a.period.localeCompare(b.period));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-slate-500 italic">
        No document distribution data available for the selected range.
      </div>
    );
  }

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
          onClick={(data) => {
            if (data?.activePayload?.[0]?.payload?.period) {
              onPeriodClick?.(data.activePayload[0].payload.period);
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.2} />
          <XAxis
            dataKey="displayPeriod"
            stroke="#64748b"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#94a3b8' }}
            interval={0}
            minTickGap={20}
            tickFormatter={(value: string, index: number) =>
              index % 5 === 0 || value === '2026' ? value : ''
            }
          />
          <YAxis
            stroke="#64748b"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#94a3b8' }}
            tickFormatter={(value) =>
              value >= 1000000
                ? `${(value / 1000000).toFixed(1)}m`
                : value >= 1000
                  ? `${(value / 1000).toFixed(0)}k`
                  : value
            }
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => (
              <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                {value}
              </span>
            )}
          />

          {/* Highlight the 2000-2002 period */}
          <ReferenceArea
            x1="2000"
            x2="2002"
            fill="rgba(239, 68, 68, 0.05)"
            stroke="rgba(239, 68, 68, 0.1)"
            strokeDasharray="3 3"
            label={{
              position: 'top',
              value: '9/11 GAP ANALYSIS ZONE',
              fill: '#ef4444',
              fontSize: 9,
              fontWeight: 'bold',
              opacity: 0.6,
            }}
          />

          <Bar
            dataKey="documents"
            name="Documents (PDF)"
            stackId="a"
            fill={BAR_COLORS.documents}
            radius={[0, 0, 0, 0]}
            animationDuration={1500}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-pdf-${index}`}
                fill={entry.period.startsWith('2001') ? '#ef4444' : BAR_COLORS.documents}
                fillOpacity={entry.period.startsWith('2001') ? 0.8 : 1}
              />
            ))}
          </Bar>
          <Bar
            dataKey="emails"
            name="Emails"
            stackId="a"
            fill={BAR_COLORS.emails}
            radius={[0, 0, 0, 0]}
            animationDuration={1500}
          />
          <Bar
            dataKey="photos"
            name="Media/Images"
            stackId="a"
            fill={BAR_COLORS.photos}
            radius={[2, 2, 0, 0]}
            animationDuration={1500}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DocumentBarChart;
