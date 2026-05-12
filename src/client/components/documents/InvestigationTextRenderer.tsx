import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatedSegmentedControl } from '@client/components/common/AnimatedSegmentedControl';
import Icon from '@client/components/common/Icon';
import { prettifyOCRText } from '@client/utils/prettifyOCR';
import styles from './InvestigationTextRenderer.module.css';

// Design System
import { Box } from '@client/design-system/components/layout/Box';
import { Flex } from '@client/design-system/components/layout/Flex';
import { Surface } from '@client/design-system/components/surfaces/Surface';
import { LqText } from '@client/design-system/components/typography/Text';

import { Button } from '@client/design-system/lib';

interface DocumentEntity {
  id?: string | number;
  entity_id?: string | number;
  name?: string;
  fullName?: string;
  entityType?: string;
  type?: string;
  role?: string;
  [key: string]: unknown;
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

const applySearchHighlight = (
  html: string,
  term?: string,
  startIndex: number = 0,
): { html: string; count: number } => {
  if (!term || term.trim().length < 2) return { html, count: 0 };
  const tokens = term
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)
    .map(escapeRegExp);
  if (tokens.length === 0) return { html, count: 0 };

  const regex = new RegExp(`(${tokens.join('|')})`, 'gi');
  let count = 0;
  const result = html.replace(regex, (match) => {
    count += 1;
    const globalIndex = startIndex + count;
    // Note: Using global class for search highlight to keep it simple with dangerouslySetInnerHTML
    return `<mark id="search-match-${globalIndex}" class="search-highlight">${match}</mark>`;
  });
  return { html: result, count };
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
    (line: string, matchStartIndex: number = 0): { html: string; count: number } => {
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

          const variantClass =
            highlightDensity === 'strong' ? 'recovery-strong' : 'recovery-subtle';
          return `<span class="recovery-token ${variantClass}" data-recovery="true">${token}</span>`;
        });
      }

      if (entityRegex) {
        html = html.replace(entityRegex, (match) => {
          const entity = entityByName.get(match.toLowerCase());
          if (!entity) return match;
          const id = String(entity.id ?? entity.entity_id ?? '');
          const safeName = escapeHtml(match);
          return `<Button unstyled type="button" class="entity-trigger" data-entity-id="${id}" data-entity-name="${safeName}">${safeName}</Button>`;
        });
      }

      const { html: finalHtml, count } = applySearchHighlight(html, searchTerm, matchStartIndex);
      return { html: finalHtml, count };
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

  const { processedSections, matchCount } = useMemo(() => {
    let totalMatches = 0;
    const sections = sectionLinesRaw.reduce<{
      sections: (ParsedSection & { lines: string[] })[];
      used: number;
    }>(
      (acc, section) => {
        if (acc.used >= lineLimit) return acc;
        const take = Math.min(section.lines.length, lineLimit - acc.used);
        const processedLines: string[] = [];
        section.lines.slice(0, take).forEach((line) => {
          const { html, count } = renderLineHtml(line, totalMatches);
          totalMatches += count;
          processedLines.push(html);
        });
        return {
          sections: [
            ...acc.sections,
            {
              ...section,
              lines: processedLines,
            },
          ],
          used: acc.used + take,
        };
      },
      { sections: [], used: 0 },
    ).sections;
    return { processedSections: sections, matchCount: totalMatches };
  }, [lineLimit, renderLineHtml, sectionLinesRaw]);

  const hasMoreLines = lineLimit < totalLineCount;

  const [prevBaseText, setPrevBaseText] = useState(baseText);
  if (baseText !== prevBaseText) {
    setPrevBaseText(baseText);
    setLineLimit(1400);
  }

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

  if (!searchTerm && currentMatchIndex !== 0) {
    setCurrentMatchIndex(0);
  } else if (searchTerm && matchCount > 0 && currentMatchIndex === 0) {
    setCurrentMatchIndex(1);
  }

  useLayoutEffect(() => {
    if (!searchTerm || matchCount === 0) return;
    const firstMatch = window.document.getElementById('search-match-1');
    if (firstMatch) {
      firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstMatch.classList.add('search-match-active');
    }
  }, [searchTerm, matchCount]);

  const navigateMatch = (direction: 'next' | 'prev') => {
    if (matchCount === 0) return;

    const prevMatch = window.document.getElementById(`search-match-${currentMatchIndex}`);
    prevMatch?.classList.remove('search-match-active');

    let nextIndex = direction === 'next' ? currentMatchIndex + 1 : currentMatchIndex - 1;
    if (nextIndex > matchCount) nextIndex = 1;
    if (nextIndex < 1) nextIndex = matchCount;

    setCurrentMatchIndex(nextIndex);
    const target = window.document.getElementById(`search-match-${nextIndex}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('search-match-active');
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePointer = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const entityButton = target.closest('.entity-trigger') as HTMLElement | null;
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
      const entityButton = target.closest('.entity-trigger') as HTMLElement | null;
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
    <Box className={styles.root}>
      {lowLegibility && (
        <Box className={styles.warningBox}>
          <Box className={styles.warningIconContainer}>
            <Icon name="AlertCircle" className={styles.warningIcon} />
          </Box>
          <Box>
            <LqText variant="xs" weight="bold" color="accent" className={styles.warningTitle}>
              Low Legibility Warning
            </LqText>
            <LqText variant="xs" color="secondary" className={styles.warningText}>
              OCR data quality is below forensic confidence threshold. Some entities or text may be
              missing. Recommendation: Switch to <strong>Raw</strong> view or open{' '}
              <strong>Original PDF</strong> for confirmation.
            </LqText>
          </Box>
        </Box>
      )}

      {excerpts.length > 0 && (
        <Surface variant="glass" className={styles.significanceSection}>
          <Box className={styles.significanceHeader}>
            <Flex align="center" gap="sm">
              <Icon name="Sparkles" className={styles.significanceIcon} />
              <LqText variant="xs" weight="black" className={styles.significanceLabel}>
                AI Intelligence: Key Excerpts
              </LqText>
            </Flex>
          </Box>
          <Box className={styles.significanceContent}>
            {excerpts.map((excerpt, i) => (
              <Box key={i} className={styles.excerptGroup}>
                <Box className={styles.excerptIndicator} />
                <LqText variant="body" color="primary" className={styles.excerptText}>
                  "{excerpt.text}"
                </LqText>
                <Box className={styles.reasonList}>
                  {excerpt.reasons.map((reason) => (
                    <span key={`${i}-${reason}`} className={styles.reasonTag}>
                      {reason}
                    </span>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </Surface>
      )}

      <Box className={styles.controlsBar}>
        <Flex align="center" gap="md">
          <LqText variant="xs" weight="black" color="muted" className={styles.modeLabel}>
            {mode === 'clean' ? 'Refined Content' : 'Original OCR Stream'}
          </LqText>
          <Button
            unstyled
            onClick={onToggleReadingMode}
            className={`${styles.iconButton} ${isReadingMode ? styles.iconButtonActive : ''} ${styles.readingModeToggle}`}
            title={isReadingMode ? 'Disable Reading Mode' : 'Enable Reading Mode'}
          >
            <Icon name="FileText" className={styles.iconMedium} />
          </Button>

          {searchTerm && matchCount > 0 && (
            <Box className={styles.matchCounter}>
              <LqText variant="xs" weight="bold" className={styles.matchLabel}>
                {currentMatchIndex} OF {matchCount} MATCHES
              </LqText>
              <Box className={styles.navGroup}>
                <Button
                  unstyled
                  onClick={() => navigateMatch('prev')}
                  className={styles.iconButton}
                  title="Previous match"
                >
                  <Icon name="ChevronLeft" className={styles.iconSmall} />
                </Button>
                <Button
                  unstyled
                  onClick={() => navigateMatch('next')}
                  className={styles.iconButton}
                  title="Next match"
                >
                  <Icon name="ChevronRight" className={styles.iconSmall} />
                </Button>
              </Box>
            </Box>
          )}
        </Flex>

        {mode === 'clean' && baselineTokens && (
          <Box className={styles.densityContainer}>
            <LqText variant="xs" weight="bold" color="muted" className={styles.densityLabel}>
              Highlight Density
            </LqText>
            <AnimatedSegmentedControl
              ariaLabel="Highlight density"
              compact
              minItemWidth="3.5rem"
              className={styles.densityToggleGroup}
              itemClassName={styles.densityButton}
              options={[
                { value: 'off', label: 'Off' },
                { value: 'subtle', label: 'Subtle' },
                { value: 'strong', label: 'Strong' },
              ]}
              value={highlightDensity}
              onChange={setHighlightDensity}
            />
            <Button
              unstyled
              type="button"
              onClick={() => onToggleRecoveryHighlights(!showRecoveryHighlights)}
              className={`${styles.recoveryToggle} ${
                showRecoveryHighlights ? styles.recoveryToggleActive : ''
              }`}
            >
              {showRecoveryHighlights ? 'Recovery On' : 'Recovery Off'}
            </Button>
          </Box>
        )}
      </Box>

      <div
        ref={containerRef}
        className={`${styles.textContainer} ${
          isReadingMode ? styles.readingMode : styles.standardMode
        }`}
      >
        <div className={styles.sectionsStack}>
          {processedSections.map((section) => (
            <Box key={section.id} className={styles.sectionGroup}>
              {section.id !== 'full' && (
                <Box className={styles.sectionHeader}>
                  <LqText variant="xs" weight="black" className={styles.sectionTitle}>
                    {section.title}
                  </LqText>
                  <Box className={styles.sectionDivider} />
                </Box>
              )}
              <div className={styles.lineStack}>
                {section.lines.map((line, lineIndex) => (
                  <div
                    key={`${section.id}-line-${lineIndex}`}
                    className={styles.line}
                    dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }}
                  />
                ))}
              </div>
            </Box>
          ))}
        </div>
        {hasMoreLines && (
          <Box className={styles.loadMoreContainer}>
            <Button
              unstyled
              type="button"
              onClick={() => setLineLimit((prev) => Math.min(totalLineCount, prev + 1200))}
              className={styles.loadMoreButton}
            >
              Load more text ({(totalLineCount - lineLimit).toLocaleString()} lines remaining)
            </Button>
            <div ref={loadMoreRef} className={styles.loadMoreSentinel} aria-hidden="true" />
          </Box>
        )}
      </div>

      {hover && (
        <Box className={styles.tooltip} style={{ left: hover.x, top: hover.y }}>
          <Box className={styles.tooltipHeader}>
            <LqText variant="xs" weight="black" color="accent" className={styles.tooltipLabel}>
              Entity Signature
            </LqText>
            <Box className={styles.tooltipIndicator} />
          </Box>
          <LqText variant="h3" weight="bold" color="primary" className={styles.tooltipTitle}>
            {hover.entity.name || hover.entity.fullName}
          </LqText>
          <LqText variant="xs" weight="semibold" color="muted" className={styles.tooltipSubtitle}>
            {hover.entity.entityType || hover.entity.type || 'IDENTIFIED ENTITY'}
          </LqText>
          {hover.entity.role && (
            <LqText variant="small" className={styles.tooltipRole}>
              "{hover.entity.role}"
            </LqText>
          )}
        </Box>
      )}
    </Box>
  );
};

export default InvestigationTextRenderer;
