import React from 'react';
import { Shield, Network, Eye, AlertTriangle } from 'lucide-react';

interface SignalAnalysisProps {
  description: string;
  rating: number;
}

export const SignalAnalysis: React.FC<SignalAnalysisProps> = ({ description, rating }) => {
  // Parse the signal string: "Signal Analysis: High exposure (7727 mentions); Direct network link to high-risk figures (12 connections); Associated visual evidence (4 items)."
  const parseSignals = () => {
    const signals = {
      exposure: {
        value: 0,
        label: 'Exposure',
        icon: Eye,
        color: 'text-[var(--accent)]',
        barColor: 'bg-[var(--accent)]',
      },
      network: {
        value: 0,
        label: 'Network',
        icon: Network,
        color: 'text-[var(--accent-secondary)]',
        barColor: 'bg-[var(--accent-secondary)]',
      },
      evidence: {
        value: 0,
        label: 'Evidence',
        icon: Shield,
        color: 'text-[var(--accent)]',
        barColor: 'bg-[var(--accent)]',
      },
      risk: {
        value: rating * 20,
        label: 'Risk Index',
        icon: AlertTriangle,
        color: 'text-[var(--accent-danger)]',
        barColor: 'bg-[var(--accent-danger)]',
      },
    };

    // Extract mentions
    const mentionsMatch = description.match(/(\d+)\s+mentions/);
    if (mentionsMatch) {
      const mentions = parseInt(mentionsMatch[1]);
      signals.exposure.value = Math.min(100, (Math.log10(mentions + 1) / 5) * 100);
    }

    // Extract connections
    const connectionsMatch = description.match(/(\d+)\s+connections/);
    if (connectionsMatch) {
      const per = parseInt(connectionsMatch[1]);
      signals.network.value = Math.min(100, (per / 20) * 100);
    }

    // Extract items (media)
    const itemsMatch = description.match(/(\d+)\s+items/);
    if (itemsMatch) {
      const items = parseInt(itemsMatch[1]);
      signals.evidence.value = Math.min(100, (items / 10) * 100);
    }

    return Object.values(signals);
  };

  const signals = parseSignals();

  return (
    <div className="bg-[var(--glass-bg-strong)]/40 border border-[var(--glass-border)] rounded-[var(--radius-xl)] p-[var(--space-5)] shadow-inner">
      <div className="flex items-center justify-between mb-[var(--space-4)]">
        <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-[var(--space-2)]">
          <Activity className="w-4 h-4 text-[var(--accent)]" />
          Forensic Signal Analysis
        </h3>
        <div className="flex gap-[var(--space-1)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-3 rounded-full ${i < rating ? 'bg-[var(--accent-danger)] shadow-[0_0_8px_color-mix(in_srgb,var(--accent-danger)_50%,transparent)]' : 'bg-[var(--glass-bg)]'}`}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-[var(--space-4)]">
        {signals.map((signal, i) => (
          <div key={i} className="space-y-[var(--space-1)]">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
              <div className={`flex items-center gap-[var(--space-1)] ${signal.color}`}>
                <signal.icon className="w-3 h-3" />
                {signal.label}
              </div>
              <span className="text-[var(--text-muted)]">{Math.round(signal.value)}%</span>
            </div>
            <div className="h-1.5 w-full bg-[var(--glass-bg)]/50 rounded-full overflow-hidden border border-[var(--glass-border)]">
              <div
                className={`h-full ${signal.barColor} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
                style={{ width: `${signal.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-[var(--space-4)] pt-[var(--space-4)] border-t border-[var(--glass-border)]">
        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed italic opacity-80 group-hover:opacity-100 transition-opacity">
          &ldquo;{description.replace('Signal Analysis: ', '')}&rdquo;
        </p>
      </div>
    </div>
  );
};

const Activity = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);
