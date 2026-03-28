/**
 * Document Viewer Component (Default)
 *
 * Displays text-based evidence with formatting preserved
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Copy, Check, Download, ChevronLeft, ChevronRight, Bookmark } from 'lucide-react';
import { prettifyOCRText } from '../../utils/prettifyOCR';
import { RedactionPlaceholder } from './RedactionPlaceholder';
import { WikiLink } from '../common/WikiLink';

interface DocumentViewerProps {
  evidence: {
    title: string;
    extractedText: string;
    contentRefined?: string;
    metadata: Record<string, unknown> & {
      source_original_url?: string;
      key_excerpts?: string[];
    };
    original_file_path?: string;
    redaction_spans?: Array<{
      span_start: number;
      span_end: number;
      inferred_class: string;
      inferred_role?: string;
      confidence: number;
      redaction_kind: 'pdf_overlay' | 'removed_text' | 'image_box' | 'unknown';
    }>;
    allEntities?: Array<{ id: string; name: string }>;
  };
}

export function DocumentViewer({ evidence }: DocumentViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [hideBoilerplate, setHideBoilerplate] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);

  const contentRef = useRef<HTMLDivElement>(null);

  const redactionSummary = React.useMemo(() => {
    const spans = evidence.redaction_spans || [];
    const byKey = new Map<
      string,
      {
        type: string;
        role?: string;
        confidence: number;
        kind: 'pdf_overlay' | 'removed_text' | 'image_box' | 'unknown';
      }
    >();
    spans.forEach((span) => {
      const type = span.inferred_class || 'unknown';
      const role = span.inferred_role;
      const key = `${type}|${role || ''}`;
      const existing = byKey.get(key);
      if (!existing || span.confidence > existing.confidence) {
        byKey.set(key, {
          type,
          role,
          confidence: span.confidence,
          kind: span.redaction_kind,
        });
      }
    });
    return Array.from(byKey.values());
  }, [evidence.redaction_spans]);

  // Get entities from the evidence prop instead of fetching all global entities
  const evidenceExtended = evidence as typeof evidence & {
    entities?: Array<{ id: string; name: string }>;
    mentionedEntities?: Array<{ id: string; name: string }>;
  };
  const entitiesList = React.useMemo(() => {
    return (
      evidenceExtended.allEntities ||
      evidenceExtended.entities ||
      evidenceExtended.mentionedEntities ||
      []
    );
  }, [evidenceExtended]);

  useEffect(() => {
    if (!searchTerm) {
      setTotalMatches(0);
      setCurrentMatch(0);
      return;
    }
    const matches = contentRef.current?.querySelectorAll('mark');
    setTotalMatches(matches?.length || 0);
    if (matches && matches.length > 0) {
      setCurrentMatch(1);
      matches[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      matches[0].classList.add(
        'ring-2',
        'ring-amber-400',
        'ring-offset-2',
        'ring-offset-slate-900',
      );
    }
  }, [searchTerm, showRaw, hideBoilerplate]);

  const navigateMatch = (direction: 'next' | 'prev') => {
    const matches = contentRef.current?.querySelectorAll('mark');
    if (!matches || matches.length === 0) return;

    matches[currentMatch - 1]?.classList.remove(
      'ring-2',
      'ring-amber-400',
      'ring-offset-2',
      'ring-offset-slate-900',
    );

    let nextIndex = direction === 'next' ? currentMatch + 1 : currentMatch - 1;
    if (nextIndex > matches.length) nextIndex = 1;
    if (nextIndex < 1) nextIndex = matches.length;

    setCurrentMatch(nextIndex);
    const target = matches[nextIndex - 1];
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('ring-2', 'ring-amber-400', 'ring-offset-2', 'ring-offset-slate-900');
  };

  interface Sentence {
    id: string | number;
    sentence_text: string;
    is_boilerplate?: boolean;
    signal_score: number;
  }
  const docEvidence = evidence as typeof evidence & { sentences?: Sentence[] };
  const hasSentences = docEvidence.sentences && docEvidence.sentences.length > 0;

  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <mark
          key={index}
          className="bg-amber-500/40 text-[var(--text-primary)] px-0.5 rounded transition-all duration-300"
        >
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  const copyText = () => {
    navigator.clipboard
      .writeText(evidence.contentRefined || evidence.extractedText || '')
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        setCopied(false);
      });
  };

  const renderContent = () => {
    if (hasSentences && !showRaw) {
      return (
        <div className="space-y-1">
          {docEvidence.sentences!.map((sent) => {
            if (hideBoilerplate && sent.is_boilerplate) return null;

            return (
              <span
                key={sent.id}
                className={`transition-colors ${
                  sent.is_boilerplate ? 'text-[var(--text-muted)] text-xs' : ''
                } ${sent.signal_score > 0.8 ? 'bg-violet-500/10 border-b border-violet-500/30' : ''}`}
                title={`Signal: ${(sent.signal_score * 100).toFixed(0)}% ${
                  sent.is_boilerplate ? '(Boilerplate)' : ''
                }`}
              >
                {searchTerm
                  ? highlightText(sent.sentence_text, searchTerm)
                  : sent.sentence_text}{' '}
              </span>
            );
          })}
        </div>
      );
    }

    const rawText = evidence.extractedText;
    const cleanText = evidence.contentRefined || prettifyOCRText(rawText);

    return (
      <div className={showRaw ? 'font-mono' : 'font-sans'}>
        {searchTerm ? (
          highlightText(showRaw ? rawText : cleanText, searchTerm)
        ) : (
          <WikiLink text={showRaw ? rawText : cleanText} entities={entitiesList} />
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-700">
      <div className="shrink-0 p-4 md:p-6 border-b border-[var(--glass-border)] flex items-center justify-between flex-wrap gap-4 bg-[var(--glass-bg-strong)]/40">
        <div className="flex-1 min-w-[240px] max-w-md relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
          <input
            type="text"
            placeholder="Scoping search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="control w-full pl-10 pr-20 py-2 surface-glass focus:!border-[var(--accent)]/50"
          />
          {totalMatches > 0 && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-[10px] font-black text-[var(--accent)] tracking-tighter uppercase whitespace-nowrap">
                {currentMatch}/{totalMatches}
              </span>
              <div className="flex gap-1 border-l border-[var(--glass-border)] pl-2">
                <button
                  onClick={() => navigateMatch('prev')}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigateMatch('next')}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Actions */}
          <div className="flex p-1 gap-1 surface-glass">
            <button
              onClick={() => setShowRaw(false)}
              className={`px-3 py-1.5 rounded-[var(--radius-lg)] text-[10px] font-black uppercase tracking-widest transition-all ${!showRaw ? 'bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30' : 'text-[var(--text-primary)] hover:text-[var(--text-muted)]'}`}
            >
              Refined
            </button>
            <button
              onClick={() => setShowRaw(true)}
              className={`px-3 py-1.5 rounded-[var(--radius-lg)] text-[10px] font-black uppercase tracking-widest transition-all ${showRaw ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-[var(--text-primary)] hover:text-[var(--text-muted)]'}`}
            >
              Raw OCR
            </button>
          </div>

          {hasSentences && !showRaw && (
            <button
              onClick={() => setHideBoilerplate(!hideBoilerplate)}
              className={`px-3 py-1.5 rounded-[var(--radius-lg)] text-[10px] font-black uppercase tracking-widest border transition-all ${
                hideBoilerplate
                  ? 'bg-[var(--glass-bg-highlight)]/60 border-[var(--glass-border)] text-[var(--text-primary)]'
                  : 'border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {hideBoilerplate ? 'Show Boilerplate' : 'Hide Boilerplate'}
            </button>
          )}

          <button
            onClick={copyText}
            className="control !h-10 px-4 flex items-center gap-2 text-xs font-bold border-[var(--glass-border)] bg-[var(--glass-bg-strong)]/60"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4 text-[var(--text-muted)]" />
            )}
            {copied ? 'Copied' : 'Copy'}
          </button>

          {(evidence.original_file_path || evidence.metadata?.source_original_url) && (
            <a
              href={evidence.original_file_path || evidence.metadata.source_original_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="control !h-10 w-10 flex items-center justify-center border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              title="Download Original"
            >
              <Download className="w-4 h-4" />
            </a>
          )}

          {redactionSummary.length > 0 && (
            <div className="flex items-center gap-2 pl-3 border-l border-[var(--glass-border)]">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Contains Redactions
              </span>
              {redactionSummary.slice(0, 3).map((item) => (
                <RedactionPlaceholder
                  key={`${item.type}-${item.role || 'unknown'}`}
                  type={item.type}
                  role={item.role}
                  confidence={item.confidence}
                  kind={item.kind}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto p-6 md:p-12 transition-all duration-500 custom-scrollbar bg-[var(--glass-bg)]"
      >
        <div className="max-w-4xl mx-auto">
          {(evidence.metadata?.key_excerpts?.length ?? 0) > 0 && !showRaw && (
            <div className="mb-12 border-l-4 border-violet-500/40 pl-6 py-2 bg-violet-500/5 rounded-r-2xl pr-6">
              <div className="flex items-center gap-2 mb-4">
                <Bookmark className="w-4 h-4 text-violet-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">
                  Forensic Highlights
                </span>
              </div>
              {evidence.metadata?.key_excerpts?.map((excerpt: string, i: number) => (
                <p
                  key={i}
                  className="text-sm text-[var(--text-secondary)] italic leading-relaxed mb-4 last:mb-0"
                >
                  "{excerpt}"
                </p>
              ))}
            </div>
          )}

          <div className="prose prose-invert max-w-none">
            <div
              className={`whitespace-pre-wrap leading-relaxed ${showRaw ? 'font-mono text-xs opacity-70' : 'font-sans text-base text-[var(--text-primary)]'}`}
            >
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
