/**
 * Document Viewer Component (Default)
 *
 * Displays text-based evidence with formatting preserved
 */

import React, { useState, useEffect, useRef } from 'react';
import Icon from '@client/components/common/Icon';
import { prettifyOCRText } from '@client/utils/prettifyOCR';
import { RedactionPlaceholder } from './RedactionPlaceholder';
import { WikiLink } from '@client/components/common/WikiLink';
import { Button, SearchField, Surface } from '@client/design-system/lib';
import styles from './DocumentViewer.module.css';

interface DocumentViewerProps {
  evidence: {
    title: string;
    extractedText: string;
    contentRefined?: string;
    metadata: Record<string, unknown> & {
      source_original_url?: string;
      key_excerpts?: string[];
    };
    sourcePath?: string;
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

  const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

  if (!searchTerm && totalMatches !== 0) {
    setTotalMatches(0);
    setCurrentMatch(0);
  }

  useEffect(() => {
    if (!searchTerm || totalMatches === 0) return;
    const matches = contentRef.current?.querySelectorAll('mark');
    if (matches && matches.length > 0) {
      setCurrentMatch(1);
      matches[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      matches[0].classList.add(styles.highlightActive);
    }
  }, [searchTerm, totalMatches]);

  const navigateMatch = (direction: 'next' | 'prev') => {
    const matches = contentRef.current?.querySelectorAll('mark');
    if (!matches || matches.length === 0) return;

    matches[currentMatch - 1]?.classList.remove(styles.highlightActive);

    let nextIndex = direction === 'next' ? currentMatch + 1 : currentMatch - 1;
    if (nextIndex > matches.length) nextIndex = 1;
    if (nextIndex < 1) nextIndex = matches.length;

    setCurrentMatch(nextIndex);
    const target = matches[nextIndex - 1];
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add(styles.highlightActive);
  };

  interface Sentence {
    id: string | number;
    sentence_text: string;
    is_boilerplate?: boolean;
    signal_score: number;
  }
  const docEvidence = evidence as typeof evidence & { sentences?: Sentence[] };
  const hasSentences = docEvidence.sentences && docEvidence.sentences.length > 0;

  const { renderedContent, derivedTotalMatches } = React.useMemo(() => {
    let matchCount = 0;

    const highlight = (text: string, search: string) => {
      if (!search.trim()) return text;
      const regex = new RegExp(`(${escapeRegExp(search)})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, index) => {
        if (part.toLowerCase() === search.toLowerCase()) {
          matchCount++;
          return (
            <mark key={index} className={styles.highlight}>
              {part}
            </mark>
          );
        }
        return part;
      });
    };

    let content: React.ReactNode;
    if (hasSentences && !showRaw) {
      content = (
        <div className={styles.sentenceList}>
          {docEvidence.sentences!.map((sent) => {
            if (hideBoilerplate && sent.is_boilerplate) return null;
            return (
              <span
                key={sent.id}
                className={[
                  styles.sentence,
                  sent.is_boilerplate ? styles.sentenceBoilerplate : '',
                  sent.signal_score > 0.8 ? styles.sentenceHighSignal : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                title={`Signal: ${(sent.signal_score * 100).toFixed(0)}% ${
                  sent.is_boilerplate ? '(Boilerplate)' : ''
                }`}
              >
                {searchTerm ? highlight(sent.sentence_text, searchTerm) : sent.sentence_text}{' '}
              </span>
            );
          })}
        </div>
      );
    } else {
      const rawText = evidence.extractedText;
      const cleanText = evidence.contentRefined || prettifyOCRText(rawText);
      const targetText = showRaw ? rawText : cleanText;

      content = (
        <div
          className={[
            styles.contentText,
            showRaw ? styles.contentTextRaw : styles.contentTextClean,
          ].join(' ')}
        >
          {searchTerm ? (
            highlight(targetText, searchTerm)
          ) : (
            <WikiLink text={targetText} entities={entitiesList} />
          )}
        </div>
      );
    }

    return { renderedContent: content, derivedTotalMatches: matchCount };
  }, [
    searchTerm,
    showRaw,
    hideBoilerplate,
    evidence,
    docEvidence.sentences,
    hasSentences,
    entitiesList,
  ]);

  if (searchTerm && totalMatches !== derivedTotalMatches) {
    setTotalMatches(derivedTotalMatches);
  }

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

  const renderContent = () => renderedContent;

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.searchGroup}>
          <SearchField
            placeholder="Scoping search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
            aria-label="Search document text"
          />
          {totalMatches > 0 && (
            <div className={styles.matchCounter}>
              <span className={styles.matchLabel}>
                {currentMatch}/{totalMatches}
              </span>
              <div className={styles.matchActions}>
                <Button
                  unstyled
                  onClick={() => navigateMatch('prev')}
                  className={styles.matchButton}
                >
                  <Icon name="ChevronLeft" className={styles.matchButtonIcon} />
                </Button>
                <Button
                  unstyled
                  onClick={() => navigateMatch('next')}
                  className={styles.matchButton}
                >
                  <Icon name="ChevronRight" className={styles.matchButtonIcon} />
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          {/* Quick Actions */}
          <Surface className={styles.segmentedControl}>
            <Button
              unstyled
              onClick={() => setShowRaw(false)}
              className={[styles.segmentedButton, !showRaw ? styles.segmentedButtonActive : '']
                .filter(Boolean)
                .join(' ')}
            >
              Refined
            </Button>
            <Button
              unstyled
              onClick={() => setShowRaw(true)}
              className={[styles.segmentedButton, showRaw ? styles.segmentedButtonRawActive : '']
                .filter(Boolean)
                .join(' ')}
            >
              Raw OCR
            </Button>
          </Surface>

          {hasSentences && !showRaw && (
            <Button
              unstyled
              onClick={() => setHideBoilerplate(!hideBoilerplate)}
              className={[styles.toggleButton, hideBoilerplate ? styles.toggleButtonActive : '']
                .filter(Boolean)
                .join(' ')}
            >
              {hideBoilerplate ? 'Show Boilerplate' : 'Hide Boilerplate'}
            </Button>
          )}

          <Button onClick={copyText} variant="secondary" size="sm" className={styles.copyButton}>
            {copied ? (
              <Icon name="Check" className={`${styles.buttonIcon} ${styles.copiedIcon}`} />
            ) : (
              <Icon name="Copy" className={styles.buttonIcon} />
            )}
            {copied ? 'Copied' : 'Copy'}
          </Button>

          {(evidence.sourcePath || evidence.metadata?.source_original_url) && (
            <Button asChild variant="ghost" size="sm" className={styles.iconButton}>
              <a
                href={evidence.sourcePath || evidence.metadata.source_original_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                title="Download Original"
              >
                <Icon name="Download" className={styles.buttonIcon} />
              </a>
            </Button>
          )}

          {redactionSummary.length > 0 && (
            <div className={styles.redactionGroup}>
              <span className={styles.redactionLabel}>Contains Redactions</span>
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
      <div ref={contentRef} className={`custom-scrollbar ${styles.contentArea}`}>
        <div className={styles.contentInner}>
          {(evidence.metadata?.key_excerpts?.length ?? 0) > 0 && !showRaw && (
            <div className={styles.highlightsPanel}>
              <div className={styles.highlightsHeader}>
                <Icon name="Bookmark" className={styles.highlightsIcon} />
                <span className={styles.highlightsLabel}>Forensic Highlights</span>
              </div>
              {evidence.metadata?.key_excerpts?.map((excerpt: string, i: number) => (
                <p key={i} className={styles.excerpt}>
                  "{excerpt}"
                </p>
              ))}
            </div>
          )}

          <div className={styles.prose}>
            <div className={styles.contentText}>{renderContent()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
