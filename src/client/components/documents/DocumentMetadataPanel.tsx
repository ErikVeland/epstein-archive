import React from 'react';
import { Database, Shield, AlertTriangle, Globe, Bot, Flag, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

interface DocumentMetadataPanelProps {
  document: any;
  analysis?: any;
  className?: string;
}

export const DocumentMetadataPanel: React.FC<DocumentMetadataPanelProps> = ({
  document,
  className = '',
}) => {
  if (!document) return null;

  const metadata = document.metadata || {};
  const linguistics = metadata.linguistics || {};

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    try {
      return format(new Date(dateString), 'PP pp');
    } catch (_e) {
      return dateString;
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const riskRating = document.redFlagRating ?? 0;
  const riskClass =
    riskRating >= 4
      ? 'risk-critical'
      : riskRating >= 3
        ? 'risk-high'
        : riskRating >= 2
          ? 'risk-medium'
          : 'risk-low';

  return (
    <div className={`space-y-6 animate-in fade-in duration-500 ${className}`}>
      {/* AI Analysis - Premium Card */}
      {metadata.ai_summary && (
        <section className="bg-gradient-to-br from-violet-500/5 to-cyan-500/5 rounded-[var(--radius-xl)] p-5 border border-white/5 shadow-[var(--glass-shadow)] overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Bot className="w-16 h-16 text-violet-400" />
          </div>
          <h3 className="text-[10px] font-black text-violet-300 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            AI Intelligence Summary
          </h3>
          <div className="space-y-4 relative z-10">
            <p className="text-[var(--text-primary)] text-sm leading-relaxed font-medium">
              {metadata.ai_summary}
            </p>
            <div className="flex items-center gap-4 text-[10px]">
              {metadata.ai_provider && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--text-muted)] uppercase font-bold">Model</span>
                  <span className="text-violet-300 font-black uppercase bg-violet-500/10 px-1.5 py-0.5 rounded">
                    {metadata.ai_provider}
                  </span>
                </div>
              )}
              {metadata.ai_enriched_at && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--text-muted)] uppercase font-bold">Analyzed</span>
                  <span className="text-[var(--text-secondary)]">
                    {formatDate(metadata.ai_enriched_at)}
                  </span>
                </div>
              )}
            </div>
            {metadata.ai_error && (
              <div className="mt-2 p-3 bg-red-950/20 border border-red-500/30 rounded-[var(--radius-xl)] text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{metadata.ai_error}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Temporal Analysis - NEW */}
      {(document.extractedDate || metadata.temporal) && (
        <section className="surface-quiet p-5 rounded-[var(--radius-xl)] border border-violet-500/20 bg-violet-500/5">
          <h3 className="text-[10px] font-black text-violet-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Database className="w-3 h-3" />
            Temporal Intelligence
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider block">
                Extracted Primary Date
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-[var(--text-primary)]">
                  {formatDate(document.extractedDate || metadata.temporal?.primary)}
                </span>
                <span className="px-1.5 py-0.5 bg-violet-500/20 text-[8px] font-black text-violet-300 rounded border border-violet-500/30 uppercase tracking-tighter">
                  Heuristic
                </span>
              </div>
            </div>

            {metadata.temporal?.min &&
              metadata.temporal?.max &&
              metadata.temporal.min !== metadata.temporal.max && (
                <div className="space-y-1">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider block">
                    Document Date Range
                  </span>
                  <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                    <span>{format(new Date(metadata.temporal.min), 'MMM yyyy')}</span>
                    <span className="text-[var(--text-primary)]">—</span>
                    <span>{format(new Date(metadata.temporal.max), 'MMM yyyy')}</span>
                  </div>
                </div>
              )}
          </div>
        </section>
      )}

      {/* Analysis & Forensics Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="surface-quiet p-4 rounded-[var(--radius-xl)] border border-white/5 flex flex-col justify-between overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-5">
            <Flag className="w-12 h-12" />
          </div>
          <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 relative z-10">
            Forensic Index
          </div>
          <div className="flex items-end gap-2 relative z-10">
            <span className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">
              {riskRating.toFixed(1)}
            </span>
            <span className="text-xs text-[var(--text-muted)] mb-1 font-bold">/ 5.0</span>
          </div>
          <div className={`semantic-chip ${riskClass} mt-3 w-fit !h-6 relative z-10`}>
            <Shield className="w-3 h-3" />
            <span className="uppercase tracking-widest font-black text-[8px]">
              {riskRating >= 4
                ? 'CRITICAL'
                : riskRating >= 3
                  ? 'HIGH'
                  : riskRating >= 2
                    ? 'MEDIUM'
                    : 'LOW'}{' '}
              PRIORITY
            </span>
          </div>
        </div>

        <div className="surface-quiet p-4 rounded-[var(--radius-xl)] border border-white/5">
          <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">
            Signal Integrity
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between group">
              <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                Complexity
              </span>
              <span className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest">
                {linguistics.readingLevel?.toFixed(1) || 'N/A'} (GRADE)
              </span>
            </div>
            <div className="flex items-center justify-between group">
              <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                Forensic Tone
              </span>
              <span
                className={`text-xs font-black uppercase tracking-widest ${
                  linguistics.sentiment === 'negative'
                    ? 'text-rose-400'
                    : linguistics.sentiment === 'positive'
                      ? 'text-emerald-400'
                      : 'text-[var(--text-muted)]'
                }`}
              >
                {linguistics.sentiment || 'OBJECTIVE'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* File Information - Stable List */}
      <section className="surface-quiet p-5 rounded-[var(--radius-xl)] border border-white/5">
        <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <Database className="w-3 h-3" />
          Forensic Verification (SHA-256)
        </h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <div className="group">
            <dt className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest group-hover:text-[var(--text-secondary)] transition-colors mb-1">
              Entry ID
            </dt>
            <dd className="text-xs text-[var(--accent)]/80 font-mono break-all leading-tight">
              {document.id}
            </dd>
          </div>
          <div className="group">
            <dt className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest group-hover:text-[var(--text-secondary)] transition-colors mb-1">
              MIME Class
            </dt>
            <dd className="text-xs text-[var(--text-primary)] font-bold uppercase tracking-widest">
              {document.fileType || document.file_type || 'RAW_DATA'}
            </dd>
          </div>
          <div className="group">
            <dt className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest group-hover:text-[var(--text-secondary)] transition-colors mb-1">
              Data Weight
            </dt>
            <dd className="text-xs text-[var(--text-primary)] font-medium">
              {formatSize(document.fileSize || document.file_size)}
            </dd>
          </div>
          <div className="group">
            <dt className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest group-hover:text-[var(--text-secondary)] transition-colors mb-1">
              Checksum
            </dt>
            <dd className="text-[10px] text-[var(--text-muted)] font-mono break-all leading-tight">
              {document.contentHash || document.content_hash || 'NON_DETERMINISTIC_HASH'}
            </dd>
          </div>
        </dl>
      </section>

      {/* Sources & Classification */}
      <section className="surface-quiet p-5 rounded-[var(--radius-xl)] border border-white/5">
        <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <Globe className="w-3 h-3" />
          Data Origin
        </h3>
        <div className="space-y-4">
          <div className="bg-[var(--glass-bg-strong)] p-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)]">
            <span className="text-[10px] text-[var(--text-muted)] block mb-1 uppercase font-black tracking-widest">
              Source Collection
            </span>
            <div className="flex items-center gap-2 text-[var(--text-primary)] text-xs font-bold uppercase tracking-wider">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
              {metadata.source_collection || 'UNCLASSIFIED_LEAK'}
            </div>
          </div>

          {metadata.source_original_url && (
            <div>
              <span className="text-[10px] text-[var(--text-muted)] block mb-1 uppercase font-black tracking-widest">
                Raw Source URL
              </span>
              <a
                href={metadata.source_original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)]/70 hover:text-[var(--accent)] text-[10px] font-mono truncate block underline decoration-cyan-500/20"
              >
                {metadata.source_original_url}
              </a>
            </div>
          )}

          {(metadata.tags?.length > 0 || document.tags?.length > 0) && (
            <div className="pt-2">
              <span className="text-[10px] text-[var(--text-muted)] block mb-2 uppercase font-black tracking-widest">
                Semantic Tags
              </span>
              <div className="flex flex-wrap gap-2">
                {[...(metadata.tags || []), ...(document.tags || [])].map(
                  (tag: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-[var(--glass-bg-highlight)] text-[10px] font-bold text-[var(--text-secondary)] rounded-md border border-[var(--glass-border)] uppercase tracking-wider"
                    >
                      {tag}
                    </span>
                  ),
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
