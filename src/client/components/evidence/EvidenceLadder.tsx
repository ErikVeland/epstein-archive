import React from 'react';
import { Shield, Search, Brain, ChevronRight, Database, Fingerprint } from 'lucide-react';

export interface EvidenceLadderProps {
  level: 1 | 2 | 3; // 1: Primary, 2: Derived, 3: Agentic
  confidence: number;
  ingestRunId?: string;
  evidencePack?: Record<string, unknown>;
  wasAgentic?: boolean;
  className?: string;
}

export const EvidenceLadder: React.FC<EvidenceLadderProps> = ({
  level,
  confidence,
  ingestRunId,
  evidencePack,
  wasAgentic,
  className = '',
}) => {
  const levels = [
    {
      id: 1,
      name: 'Primary Source',
      description: 'Direct mention in original evidentiary document.',
      icon: Search,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    },
    {
      id: 2,
      name: 'Derived Link',
      description: 'Established via proximity or co-occurrence analysis.',
      icon: Shield,
      color: 'text-[var(--accent)]',
      bgColor: 'bg-[var(--accent)]/10',
      borderColor: 'border-[var(--accent)]/20',
    },
    {
      id: 3,
      name: 'Agentic Inference',
      description: 'Derived using LLM-assisted context reconciliation.',
      icon: Brain,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
  ];

  const activeLevel = levels.find((l) => l.id === level) || levels[0];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Active Level Badge */}
      <div
        className={`flex items-start gap-4 p-4 rounded-[var(--radius-xl)] border ${activeLevel.borderColor} ${activeLevel.bgColor} backdrop-blur-sm`}
      >
        <div
          className={`p-2 rounded-[var(--radius-lg)] ${activeLevel.borderColor} border bg-[var(--glass-bg)]`}
        >
          <activeLevel.icon size={20} className={activeLevel.color} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className={`font-bold text-sm uppercase tracking-wider ${activeLevel.color}`}>
              {activeLevel.name}
            </h4>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                Confidence
              </span>
              <span
                className={`text-xs font-bold ${confidence * 100 > 80 ? 'text-emerald-400' : 'text-amber-400'}`}
              >
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            {activeLevel.description}
          </p>
        </div>
      </div>

      {/* Forensic Provenance */}
      {(ingestRunId || wasAgentic) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ingestRunId && (
            <div className="p-3 bg-[var(--glass-bg-strong)]/40 border border-[var(--glass-border)] rounded-[var(--radius-lg)] flex items-center gap-3">
              <Database size={14} className="text-[var(--text-muted)]" />
              <div className="flex-1 min-w-0">
                <span className="block text-[10px] uppercase tracking-tighter text-[var(--text-muted)] font-bold">
                  Ingest Run
                </span>
                <span className="block text-xs font-mono text-[var(--text-secondary)] truncate">
                  {ingestRunId}
                </span>
              </div>
            </div>
          )}
          {wasAgentic && (
            <div className="p-3 bg-purple-900/10 border border-purple-500/20 rounded-[var(--radius-lg)] flex items-center gap-3">
              <Fingerprint size={14} className="text-purple-400" />
              <div className="flex-1">
                <span className="block text-[10px] uppercase tracking-tighter text-purple-400 font-bold">
                  Agentic Stamp
                </span>
                <span className="block text-xs text-purple-300">LLM-Processed</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Evidence Pack Details (Optional) */}
      {evidencePack && (
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-3 space-y-2">
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest px-1">
            <ChevronRight size={12} />
            Structural Context
          </div>
          <div className="flex flex-wrap gap-2">
            {Number(evidencePack.proximity || 0) > 0 && (
              <span className="px-2 py-1 rounded bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-[10px] text-[var(--text-secondary)] font-mono">
                PROX: {Number(evidencePack.proximity || 0)} chars
              </span>
            )}
            {Number(evidencePack.document_count || 0) > 0 && (
              <span className="px-2 py-1 rounded bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-[10px] text-[var(--text-secondary)] font-mono">
                DOCS: {Number(evidencePack.document_count || 0)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
