import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, AlertCircle, ChevronRight, ChevronLeft, FileText } from 'lucide-react';
import { prettifyOCRText } from '../../utils/prettifyOCR';

interface DocumentEntity {
  id?: string | number;
  entity_id?: string | number;
  name?: string;
  fullName?: string;
  entityType?: string;
  type?: string;
  role?: string;
}

interface DocumentRecord {
  content?: string;
  contentRefined?: string;
  entities?: DocumentEntity[];
  mentionedEntities?: DocumentEntity[];
  metadata?: {
    ocr_confidence?: number;
    high_significance_evidence?: unknown[];
    key_excerpts?: unknown[];
    [key: string]: unknown;
  };
  unredaction_metrics?: {
    baselineVocab?: string;
    [key: string]: unknown;
  };
}

interface InvestigationTextRendererProps {
  document: DocumentRecord;
  mode: 'clean' | 'ocr';
  searchTerm?: string;
  showRecoveryHighlights: boolean;
  isReadingMode: boolean;
  onToggleReadingMode: () => void;
  onToggleRecoveryHighlights: (next: boolean) => void;
  onEntitySelect?: (entity: DocumentEntity) => void;
}

interface ParsedSection {
  id: string;
  title: string;
  body: string;
}

interface SignificanceExcerpt {
  text: string;
  reasons: string[];
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const applySearchHighlight = (html: string, term?: string): string => {
  if (!term || term.trim().length < 2) return html;
  const tokens = term
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)
    .map(escapeRegExp);
  if (tokens.length === 0) return html;

  const regex = new RegExp(`(${tokens.join('|')})`, 'gi');
  return html.replace(
    regex,
    '<mark class="search-match bg-[var(--accent)]/20 text-cyan-50 px-0.5 rounded border-b-2 border-[var(--accent)]/80 shadow-[0_0_15px_rgba(34,211,238,0.2)]">$1</mark>',
  );
};

const parseSections = (text: string): ParsedSection[] => {
  const lines = text.split('\n');
  const headingRegex = /^[A-Z][A-Z0-9\s\-/:&]{5,}$/;
  const headingIndices: Array<{ index: number; title: string }> = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.length < 5 || trimmed.length > 90) return;
    if (!headingRegex.test(trimmed)) return;
    if (/^[0-9\W]+$/.test(trimmed)) return;
    headingIndices.push({ index, title: trimmed });
  });

  if (headingIndices.length < 2) {
    return [{ id: 'full', title: 'Document text', body: text }];
  }

  const sections: ParsedSection[] = [];
  for (let i = 0; i < headingIndices.length; i += 1) {
    const current = headingIndices[i];
    const next = headingIndices[i + 1];
    const bodyStart = current.index + 1;
    const bodyEnd = next ? next.index : lines.length;
    const body = lines.slice(bodyStart, bodyEnd).join('\n').trim();
    sections.push({
      id: `section-${i}`,
      title: current.title,
      body,
    });
  }

  return sections;
};

const getEntityList = (document: DocumentRecord): DocumentEntity[] => {
  const fromDocument = Array.isArray(document?.entities) ? document.entities : [];
  const fromMentioned = Array.isArray(document?.mentionedEntities)
    ? document.mentionedEntities
    : [];
  const combined = [...fromDocument, ...fromMentioned];

  const byName = new Map<string, DocumentEntity>();
  for (const entity of combined) {
    const name = String(entity?.fullName || entity?.name || '').trim();
    if (!name) continue;
    if (!byName.has(name.toLowerCase())) {
      byName.set(name.toLowerCase(), { ...entity, name });
    }
  }
  return Array.from(byName.values());
};

const hasLegibleSignal = (value: string): boolean => {
  const text = value.trim();
  if (text.length < 25) return false;
  const alphaNumeric = (text.match(/[a-z0-9]/gi) || []).length;
  return alphaNumeric / text.length > 0.5;
};

const inferReasonTags = (value: string): string[] => {
  const reasons = new Set<string>();
  const lower = value.toLowerCase();
  if (/\$\s?\d|usd|payment|wire|transfer|bank|account/.test(lower)) reasons.add('financial');
  if (/email|message|call|thread|phone/.test(lower)) reasons.add('communications');
  if (/flight|airport|schedule|trip|manifest/.test(lower)) reasons.add('travel');
  if (/meeting|arranged|introduced|contact/.test(lower)) reasons.add('coordination');
  if (/epstein|maxwell|trump|clinton|wexner|dershowitz/.test(lower)) reasons.add('key-person');
  if (/address|location|island|palm beach|new york/.test(lower)) reasons.add('location');
  if (reasons.size === 0) reasons.add('context');
  return Array.from(reasons).slice(0, 3);
};

const deriveSignificanceExcerpts = (
  document: DocumentRecord,
  cleanText: string,
  entityNames: string[],
): SignificanceExcerpt[] => {
  const metadataExcerpts =
    document?.metadata?.high_significance_evidence || document?.metadata?.key_excerpts || [];

  const normalized = Array.isArray(metadataExcerpts)
    ? metadataExcerpts
        .map((item: unknown) => {
          if (typeof item === 'string') {
            const text = item.trim();
            return text ? { text, reasons: inferReasonTags(text) } : null;
          }
          const obj = item as Record<string, unknown>;
          const text = String(obj?.excerpt || obj?.text || obj?.passage || '').trim();
          if (!text) return null;
          const reasons = Array.isArray(obj?.reasons)
            ? (obj.reasons as unknown[]).map((r: unknown) => String(r)).filter(Boolean)
            : inferReasonTags(text);
          return { text, reasons };
        })
        .filter((entry): entry is SignificanceExcerpt =>
          Boolean(entry && hasLegibleSignal(entry.text)),
        )
    : [];

  if (normalized.length > 0) return normalized.slice(0, 8);

  const excerptText = cleanText.slice(0, 24000);
  const sentences = excerptText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 45 && hasLegibleSignal(sentence));

  const entityTokens = entityNames.map((name) => name.toLowerCase());
  const scored = sentences.map((sentence) => {
    const lower = sentence.toLowerCase();
    let score = 0;
    if (/\$\s?\d|usd|payment|wire|transfer|bank|account/.test(lower)) score += 4;
    if (/email|message|call|thread/.test(lower)) score += 3;
    if (/flight|manifest|trip|meeting|arranged/.test(lower)) score += 2;
    if (/confidential|urgent|secret/.test(lower)) score += 2;
    if (entityTokens.some((token) => token && lower.includes(token))) score += 3;
    if (sentence.length > 240) score -= 1;
    return {
      text: sentence,
      score,
      reasons: inferReasonTags(sentence),
    };
  });

  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((entry) => ({ text: entry.text, reasons: entry.reasons }));
};

export const InvestigationTextRenderer: React.FC<InvestigationTextRendererProps> = ({
  document,
  mode,
  searchTerm,
  showRecoveryHighlights,
  isReadingMode,
  onToggleReadingMode,
  onToggleRecoveryHighlights,
  onEntitySelect,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; entity: DocumentEntity } | null>(null);
  const [highlightDensity, setHighlightDensity] = useState<'off' | 'subtle' | 'strong'>('subtle');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [lineLimit, setLineLimit] = useState(1400);

  const entityList = useMemo(() => getEntityList(document), [document]);

  const baseText = useMemo(() => {
    const original = String(document?.content || '');
    if (mode === 'ocr') return original;
    if (document?.contentRefined && String(document.contentRefined).trim().length > 0) {
      return String(document.contentRefined);
    }
    return prettifyOCRText(original);
  }, [document, mode]);

  const sections = useMemo(() => parseSections(baseText), [baseText]);
  const sectionLinesRaw = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        lines: section.body.split('\n'),
      })),
    [sections],
  );
  const totalLineCount = useMemo(
    () => sectionLinesRaw.reduce((sum, section) => sum + section.lines.length, 0),
    [sectionLinesRaw],
  );

  const baselineTokens = useMemo(() => {
    const raw = document?.unredaction_metrics?.baselineVocab;
    if (typeof raw !== 'string' || raw.trim().length === 0) return null;
    const set = new Set<string>();
    raw.split(/\s+/).forEach((token: string) => {
      const normalized = token.trim().toLowerCase();
      if (normalized) set.add(normalized);
    });
    return set;
  }, [document]);

  const excerpts = useMemo(
    () =>
      deriveSignificanceExcerpts(
        document,
        String(document?.contentRefined || document?.content || ''),
        entityList.map((entity) => String(entity?.name || '')),
      ),
    [document, entityList],
  );

  const lowLegibility = useMemo(() => {
    const ocrConf = document?.metadata?.ocr_confidence;
    if (typeof ocrConf === 'number' && ocrConf < 0.6) return true;
    const text = String(document?.content || '');
    if (text.length > 500) {
      const gibberishMatch = text.match(/[^a-zA-Z0-9\s.,\-\n]/g);
      if (gibberishMatch && gibberishMatch.length / text.length > 0.15) return true;
    }
    return false;
  }, [document]);

  const entityRegex = useMemo(() => {
    const names = entityList
      .map((entity) => String(entity?.name || '').trim())
      .filter((name) => name.length >= 3)
      .sort((a, b) => b.length - a.length)
      .slice(0, 250)
      .map(escapeRegExp);

    if (names.length === 0) return null;
    return new RegExp(`\\b(${names.join('|')})\\b`, 'g');
  }, [entityList]);

  const entityByName = useMemo(() => {
    const map = new Map<string, DocumentEntity>();
    entityList.forEach((entity) => {
      map.set(String(entity.name).toLowerCase(), entity);
    });
    return map;
  }, [entityList]);

  const renderLineHtml = useCallback(
    (line: string): string => {
      let html = escapeHtml(line);

      if (
        mode === 'clean' &&
        highlightDensity !== 'off' &&
        baselineTokens &&
        showRecoveryHighlights
      ) {
        html = html.replace(/([A-Za-z0-9']+)/g, (token) => {
          const normalized = token.toLowerCase();
          if (baselineTokens.has(normalized)) return token;

          const style =
            highlightDensity === 'strong'
              ? 'bg-emerald-500/10 border-b border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.1)]'
              : 'border-b border-emerald-500/30';
          return `<span class="${style} rounded-sm transition-all duration-300" data-recovery="true">${token}</span>`;
        });
      }

      if (entityRegex) {
        html = html.replace(entityRegex, (match) => {
          const entity = entityByName.get(match.toLowerCase());
          if (!entity) return match;
          const id = String(entity.id ?? entity.entity_id ?? '');
          const safeName = escapeHtml(match);
          return `<button type="button" class="entity-inline text-[var(--accent)] hover:text-cyan-100 underline decoration-cyan-500/40 underline-offset-2 transition-colors" data-entity-id="${id}" data-entity-name="${safeName}">${safeName}</button>`;
        });
      }

      html = applySearchHighlight(html, searchTerm);
      return html;
    },
    [
      baselineTokens,
      entityByName,
      entityRegex,
      mode,
      searchTerm,
      highlightDensity,
      showRecoveryHighlights,
    ],
  );

  const processedSections = useMemo(() => {
    return sectionLinesRaw.reduce<{
      sections: (ParsedSection & { lines: string[] })[];
      used: number;
    }>(
      (acc, section) => {
        if (acc.used >= lineLimit) return acc;
        const take = Math.min(section.lines.length, lineLimit - acc.used);
        return {
          sections: [
            ...acc.sections,
            {
              ...section,
              lines: section.lines.slice(0, take).map((line) => renderLineHtml(line)),
            },
          ],
          used: acc.used + take,
        };
      },
      { sections: [], used: 0 },
    ).sections;
  }, [lineLimit, renderLineHtml, sectionLinesRaw]);

  const hasMoreLines = lineLimit < totalLineCount;

  useLayoutEffect(() => {
    setLineLimit(1400);
  }, [baseText]);

  useEffect(() => {
    if (!hasMoreLines || !loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setLineLimit((prev) => Math.min(totalLineCount, prev + 900));
        }
      },
      { rootMargin: '220px 0px' },
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMoreLines, totalLineCount]);

  useLayoutEffect(() => {
    if (!searchTerm) {
      setMatchCount(0);
      setCurrentMatchIndex(0);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (!searchTerm) return;
    const matches = containerRef.current?.querySelectorAll('.search-match');
    const count = matches?.length || 0;
    setMatchCount(count);
    if (count > 0) {
      setCurrentMatchIndex(1);
      matches?.[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      matches?.[0].classList.add('ring-2', 'ring-amber-400');
    }
  }, [searchTerm, processedSections]);

  const navigateMatch = (direction: 'next' | 'prev') => {
    const matches = containerRef.current?.querySelectorAll('.search-match');
    if (!matches || matches.length === 0) return;

    matches[currentMatchIndex - 1]?.classList.remove('ring-2', 'ring-amber-400');

    let nextIndex = direction === 'next' ? currentMatchIndex + 1 : currentMatchIndex - 1;
    if (nextIndex > matches.length) nextIndex = 1;
    if (nextIndex < 1) nextIndex = matches.length;

    setCurrentMatchIndex(nextIndex);
    const target = matches[nextIndex - 1];
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('ring-2', 'ring-amber-400');
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePointer = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const entityButton = target.closest('.entity-inline') as HTMLElement | null;
      if (!entityButton) {
        setHover((previous) => (previous ? null : previous));
        return;
      }
      const entityName = entityButton.getAttribute('data-entity-name') || '';
      const entityId = entityButton.getAttribute('data-entity-id') || '';
      const entity =
        entityByName.get(entityName.toLowerCase()) ||
        entityList.find((candidate) => String(candidate.id) === entityId);
      if (!entity) return;
      setHover({ x: event.clientX + 12, y: event.clientY + 10, entity });
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const entityButton = target.closest('.entity-inline') as HTMLElement | null;
      if (!entityButton || !onEntitySelect) return;
      event.preventDefault();
      const entityName = entityButton.getAttribute('data-entity-name') || '';
      const entityId = entityButton.getAttribute('data-entity-id') || '';
      const entity =
        entityByName.get(entityName.toLowerCase()) ||
        entityList.find((candidate) => String(candidate.id) === entityId);
      if (entity) onEntitySelect(entity);
    };

    container.addEventListener('mousemove', handlePointer);
    container.addEventListener('click', handleClick);

    return () => {
      container.removeEventListener('mousemove', handlePointer);
      container.removeEventListener('click', handleClick);
    };
  }, [entityByName, entityList, onEntitySelect]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {lowLegibility && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-[var(--radius-xl)] flex items-start gap-4">
          <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-amber-500/20 flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6 text-amber-500" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-200 uppercase tracking-widest mb-1">
              Low Legibility Warning
            </h4>
            <div className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-2xl">
              OCR data quality is below forensic confidence threshold. Some entities or text may be
              missing. Recommendation: Switch to <strong>Raw</strong> view or open{' '}
              <strong>Original PDF</strong> for confirmation.
            </div>
          </div>
        </div>
      )}

      {excerpts.length > 0 && (
        <section className="glass-surface border-violet-500/20 rounded-[var(--radius-xl)] overflow-hidden shadow-[var(--glass-shadow)] shadow-violet-950/20">
          <div className="bg-violet-500/10 px-6 py-3 border-b border-violet-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">
                AI Intelligence: Key Excerpts
              </span>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {excerpts.map((excerpt, i) => (
              <div
                key={i}
                className="group relative pl-6 border-l-2 border-violet-500/30 hover:border-violet-400 transition-colors"
              >
                <div className="absolute -left-1 top-0 w-2 h-2 rounded-full bg-violet-500/40 scale-0 group-hover:scale-100 transition-transform" />
                <blockquote className="italic text-base md:text-lg text-[var(--text-primary)] leading-relaxed font-serif selection:bg-violet-500/30">
                  "{excerpt.text}"
                </blockquote>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {excerpt.reasons.map((reason) => (
                    <span
                      key={`${i}-${reason}`}
                      className="px-2 py-0.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-[10px] uppercase tracking-wide text-violet-200"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center justify-between gap-4 py-2 border-b border-[color:color-mix(in_srgb,var(--glass-border)_42%,transparent)]">
        <div className="flex items-center gap-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] flex items-center gap-3">
            {mode === 'clean' ? 'Refined Content' : 'Original OCR Stream'}
            <button
              onClick={onToggleReadingMode}
              className={`p-1 rounded-md transition-all ${
                isReadingMode
                  ? 'bg-[var(--accent)]/20 text-[var(--accent)] shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                  : 'text-[var(--text-primary)] hover:text-[var(--text-muted)]'
              }`}
              title={isReadingMode ? 'Disable Reading Mode' : 'Enable Reading Mode'}
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          </div>
          {searchTerm && matchCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/10 px-2 py-1 rounded text-[10px] font-bold text-amber-300 border border-amber-500/20">
              <span className="opacity-60">
                {currentMatchIndex} OF {matchCount} MATCHES
              </span>
              <div className="flex gap-1 ml-1">
                <button
                  onClick={() => navigateMatch('prev')}
                  className="hover:text-[var(--text-primary)] transition-colors"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  onClick={() => navigateMatch('next')}
                  className="hover:text-[var(--text-primary)] transition-colors"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {mode === 'clean' && baselineTokens && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
              Highlight Density
            </span>
            <div className="flex p-0.5 bg-[var(--glass-bg-strong)]/60 rounded-[var(--radius-lg)] border border-[color:color-mix(in_srgb,var(--glass-border)_42%,transparent)]">
              {(['off', 'subtle', 'strong'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setHighlightDensity(d)}
                  className={`px-2 py-1 rounded text-[8px] font-black uppercase transition-all ${
                    highlightDensity === d
                      ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'text-[var(--text-primary)] hover:text-[var(--text-muted)]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onToggleRecoveryHighlights(!showRecoveryHighlights)}
              className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border transition-all ${
                showRecoveryHighlights
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                  : 'border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {showRecoveryHighlights ? 'Recovery On' : 'Recovery Off'}
            </button>
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        className={`text-[var(--text-primary)] selection:bg-[var(--accent)]/30 transition-all duration-500 ${
          isReadingMode
            ? 'font-serif text-xl lg:text-2xl leading-[2] max-w-3xl mx-auto'
            : 'font-sans text-base lg:text-lg leading-[1.8] tracking-tight'
        }`}
      >
        <div className="space-y-8">
          {processedSections.map((section) => (
            <div key={section.id} className="group relative">
              {section.id !== 'full' && (
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--accent)]/70">
                    {section.title}
                  </h3>
                  <div className="flex-1 h-px bg-[var(--accent)]/10" />
                </div>
              )}
              <div className="space-y-1">
                {section.lines.map((line, lineIndex) => (
                  <div
                    key={`${section.id}-line-${lineIndex}`}
                    className="min-h-[24px]"
                    dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        {hasMoreLines && (
          <div className="mt-8 border-t border-[color:color-mix(in_srgb,var(--glass-border)_42%,transparent)] pt-6">
            <button
              type="button"
              onClick={() => setLineLimit((prev) => Math.min(totalLineCount, prev + 1200))}
              className="control h-10 px-4 text-xs font-semibold"
            >
              Load more text ({(totalLineCount - lineLimit).toLocaleString()} lines remaining)
            </button>
            <div ref={loadMoreRef} className="h-1 w-full" aria-hidden="true" />
          </div>
        )}
      </div>

      {hover && (
        <div
          className="fixed z-[11000] pointer-events-none rounded-[var(--radius-xl)] border border-[color:color-mix(in_srgb,var(--glass-border)_52%,transparent)] bg-[var(--glass-bg-strong)]/95 backdrop-blur-md p-4 text-xs shadow-[var(--glass-shadow)] animate-in zoom-in-95 duration-200"
          style={{ left: hover.x, top: hover.y }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[8px] font-black uppercase text-[var(--accent)] tracking-widest">
              Entity Signature
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          </div>
          <div className="font-bold text-sm text-[var(--text-primary)] mb-1">
            {hover.entity.name || hover.entity.fullName}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
            {hover.entity.entityType || hover.entity.type || 'IDENTIFIED ENTITY'}
          </div>
          {hover.entity.role && (
            <div className="mt-2 text-[var(--text-muted)] italic">"{hover.entity.role}"</div>
          )}
        </div>
      )}
    </div>
  );
};

export default InvestigationTextRenderer;
