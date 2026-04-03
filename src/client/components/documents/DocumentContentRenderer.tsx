import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bot,
  Calendar,
  FileImage,
  FileSpreadsheet,
  Landmark,
  Mail,
  Newspaper,
  Scale,
  ScrollText,
} from 'lucide-react';
import { DocumentAnnotationSystem } from './DocumentAnnotationSystem';
import { prettifyOCRText } from '../../utils/prettifyOCR';
import DOMPurify from 'isomorphic-dompurify';
import { Surface, Box, Flex, LqText } from '../../design-system/lib';

interface EntityRecord {
  id?: string | number;
  name?: string;
  fullName?: string;
  entityType?: string;
  [key: string]: unknown;
}

interface UnredactionMetrics {
  unredactedTextGain?: number;
  baselineVocab?: string | null;
}

interface EmailHeaders {
  from?: string;
  to?: string;
  cc?: string;
  subject?: string;
  sentDate?: string;
}

interface DocMetadata {
  emailHeaders?: EmailHeaders;
  temporal?: {
    primary?: string;
    min?: string;
    max?: string;
  };
  linguistics?: {
    readingLevel?: number;
    sentiment?: string;
  };
  [key: string]: unknown;
}

interface DocRecord {
  id: string | number;
  title?: string;
  content: string;
  contentRefined?: string;
  evidenceType?: string;
  fileType?: string;
  originalFileUrl?: string;
  page_number?: number;
  metadata?: DocMetadata;
  entities?: EntityRecord[];
  mentionedEntities?: EntityRecord[];
  unredaction_metrics?: UnredactionMetrics;
  [key: string]: unknown;
}

interface DocumentContentRendererProps {
  document: DocRecord;
  searchTerm?: string;
  showRaw?: boolean;
}

export const DocumentContentRenderer: React.FC<DocumentContentRendererProps> = ({
  document: doc,
  searchTerm,
  showRaw = false,
}) => {
  const getEntityName = (entity: EntityRecord): string =>
    String(entity?.fullName || entity?.name || '').trim();

  const [showAnnotations, setShowAnnotations] = useState(false);
  const [entityMap, setEntityMap] = useState<Map<string, EntityRecord>>(new Map());
  const [entities, setEntities] = useState<EntityRecord[]>([]);
  const [entityRegexes, setEntityRegexes] = useState<RegExp[]>([]);
  const [showUnredactedHighlights, setShowUnredactedHighlights] = useState(true);

  // Process entities from the document object
  useEffect(() => {
    const entityData = doc.entities || doc.mentionedEntities || [];
    if (entityData.length === 0) {
      setEntities([]);
      setEntityMap(new Map());
      setEntityRegexes([]);
      return;
    }

    setEntities(entityData);

    const map = new Map<string, EntityRecord>();
    const sorted = [...entityData].sort((a, b) => {
      const nameA = getEntityName(a);
      const nameB = getEntityName(b);
      return nameB.length - nameA.length;
    });

    const terms: string[] = [];
    sorted.forEach((e) => {
      const name = getEntityName(e);
      if (name && name.length > 3) {
        map.set(name.toLowerCase(), e);
        terms.push(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      }
    });

    setEntityMap(map);

    const CHUNK_SIZE = 200;
    const chunks: RegExp[] = [];
    for (let i = 0; i < terms.length; i += CHUNK_SIZE) {
      const chunk = terms.slice(i, i + CHUNK_SIZE);
      if (chunk.length > 0) {
        chunks.push(new RegExp(`\\b(${chunk.join('|')})\\b`, 'gi'));
      }
    }
    setEntityRegexes(chunks);
  }, [doc.entities, doc.mentionedEntities]);

  const highlightText = useCallback((text: string, term?: string) => {
    if (!term || !text || typeof text !== 'string') return text;

    try {
      const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const terms = term.split(/\s+/).filter((t) => t.length > 2);

      if (terms.length === 0) {
        if (term.trim().length > 0) {
          const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
          return text.replace(
            regex,
            '<mark class="bg-amber-500/40 text-[var(--text-primary)] px-1 rounded border border-amber-500/30">$1</mark>',
          );
        }
        return text;
      }

      const pattern = `(${terms.map(escapeRegExp).join('|')})`;
      const regex = new RegExp(pattern, 'gi');
      return text.replace(
        regex,
        '<mark class="bg-amber-500/40 text-[var(--text-primary)] px-1 rounded border border-amber-500/30">$1</mark>',
      );
    } catch (e) {
      console.warn('Error highlighting text:', e);
      return text;
    }
  }, []);

  const renderHighlightedText = useCallback((text: string, term?: string): React.ReactNode => {
    if (!term || !text) return text;
    try {
      const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const terms = term.split(/\s+/).filter((t) => t.length > 2);
      const pattern = terms.length > 0 ? terms.map(escapeRegExp).join('|') : escapeRegExp(term);
      if (!pattern) return text;
      const regex = new RegExp(`(${pattern})`, 'gi');
      const parts = text.split(regex);
      return (
        <span>
          {parts.map((part, i) =>
            regex.test(part) ? (
              <mark
                key={i}
                className="bg-amber-500/40 text-[var(--text-primary)] px-1 rounded border border-amber-500/30"
              >
                {part}
              </mark>
            ) : (
              part
            ),
          )}
        </span>
      );
    } catch {
      return text;
    }
  }, []);

  const linkEntitiesInText = useCallback(
    (text: string) => {
      if (!text || entityRegexes.length === 0 || entityMap.size === 0) return text;

      let processedText = text;
      entityRegexes.forEach((regex) => {
        processedText = processedText.replace(regex, (match) => {
          const entity = entityMap.get(match.toLowerCase());
          if (!entity) return match;

          const entityName = getEntityName(entity);
          return `<span class="entity-link" data-entity-id="${entity.id}" data-entity-name="${entityName}" style="color: var(--accent); text-decoration: underline; cursor: pointer; border-bottom: 1px dotted var(--accent); padding: 0 1px;" title="Click to view entity details">${match}</span>`;
        });
      });

      return processedText;
    },
    [entityRegexes, entityMap],
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('.entity-link');
      if (link) {
        e.preventDefault();
        e.stopPropagation();

        const entityId = link.getAttribute('data-entity-id');
        const entityName = link.getAttribute('data-entity-name');

        if (entityId && entityName) {
          const event = new CustomEvent('entityClick', {
            detail: { id: entityId, name: entityName },
          });
          window.dispatchEvent(event);
        }
      }
    };

    const container = document.body;
    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, []);

  const processedContent = useMemo(() => {
    const rawText = doc.contentRefined && !showRaw ? doc.contentRefined : doc.content;
    const baseContent = showRaw ? rawText : prettifyOCRText(rawText);

    let content = baseContent as string;
    try {
      const baselineVocab = doc.unredaction_metrics?.baselineVocab;
      if (
        showUnredactedHighlights &&
        baselineVocab &&
        typeof content === 'string' &&
        content.length > 0
      ) {
        const baselineTokens = new Set<string>();
        for (const t of baselineVocab.split(/\s+/)) {
          const token = t.trim().toLowerCase();
          if (!token) continue;
          baselineTokens.add(token);
        }

        const parts: string[] = [];
        const tokenRegex = /([A-Za-z0-9']+|[^A-Za-z0-9']+)/g;
        let match: RegExpExecArray | null;
        while ((match = tokenRegex.exec(content)) !== null) {
          const fragment = match[0];
          if (/^[A-Za-z0-9']+$/.test(fragment)) {
            const key = fragment.toLowerCase();
            if (!baselineTokens.has(key)) {
              const escaped = fragment
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
              parts.push(
                `<mark class="bg-emerald-800/40 border border-emerald-500/40 rounded px-0.5 py-0 text-emerald-100" title="Newly unredacted text">${escaped}</mark>`,
              );
            } else {
              parts.push(fragment);
            }
          } else {
            parts.push(fragment);
          }
        }
        content = parts.join('');
      }
    } catch (e) {
      console.warn('Error applying unredaction baseline highlighting:', e);
    }

    const contentWithEntities = entityRegexes.length > 0 ? linkEntitiesInText(content) : content;

    const finalHtml = searchTerm
      ? highlightText(contentWithEntities, searchTerm)
      : contentWithEntities;

    return DOMPurify.sanitize(finalHtml, {
      USE_PROFILES: { html: true },
      ADD_TAGS: ['mark', 'span'],
      ADD_ATTR: ['class', 'style', 'data-entity-id', 'data-entity-name', 'title', 'target', 'rel'],
    });
  }, [
    doc.content,
    doc.contentRefined,
    showRaw,
    searchTerm,
    doc.unredaction_metrics,
    showUnredactedHighlights,
    linkEntitiesInText,
    entityRegexes,
    highlightText,
  ]);

  return (
    <Box className="prose prose-invert max-w-none">
      <Flex align="center" justify="between" className="mb-4">
        <Flex align="center" gap="md">
          <Flex align="center" gap="sm">
            {doc.evidenceType === 'email' ? (
              <Mail className="w-4 h-4 text-[var(--accent)]" />
            ) : doc.evidenceType === 'legal' ? (
              <Scale className="w-4 h-4 text-[var(--accent)]" />
            ) : doc.evidenceType === 'deposition' ? (
              <ScrollText className="w-4 h-4 text-[var(--accent)]" />
            ) : doc.evidenceType === 'financial' ? (
              <Landmark className="w-4 h-4 text-[var(--accent)]" />
            ) : doc.fileType?.match(/jpe?g|png|gif|bmp|webp/i) ? (
              <FileImage className="w-4 h-4 text-[var(--accent)]" />
            ) : doc.fileType?.match(/csv|xls/i) ? (
              <FileSpreadsheet className="w-4 h-4 text-[var(--accent)]" />
            ) : null}
            <LqText variant="small" color="muted" weight="medium">
              {doc.evidenceType === 'email'
                ? 'Email Message'
                : doc.evidenceType === 'legal'
                  ? 'Legal Document'
                  : doc.evidenceType === 'deposition'
                    ? 'Deposition'
                    : doc.evidenceType === 'financial'
                      ? 'Financial Record'
                      : doc.fileType?.match(/jpe?g|png|gif|bmp|webp/i)
                        ? 'Image'
                        : doc.fileType?.match(/csv|xls/i)
                          ? 'Spreadsheet'
                          : 'Document Content'}
            </LqText>
          </Flex>
          {doc.contentRefined && !showRaw && (
            <Box className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-purple-900/40 text-purple-300 border border-purple-500/40">
              <Flex align="center" gap="xs">
                <Bot className="w-3 h-3" />
                <span>AI Refined</span>
              </Flex>
            </Box>
          )}
        </Flex>

        {!doc.fileType?.match(/jpe?g|png|gif|bmp|webp|csv|xls/i) && (
          <Flex align="center" gap="lg">
            {typeof doc.unredaction_metrics?.unredactedTextGain === 'number' && (
              <Flex align="center" gap="md">
                <LqText
                  variant="xs"
                  weight="bold"
                  className="text-emerald-400 bg-emerald-900/40 border border-emerald-500/40 px-2 py-0.5 rounded-full"
                >
                  Unredacted gain:{' '}
                  {Math.round((doc.unredaction_metrics.unredactedTextGain || 0) * 100)}%
                </LqText>
                <label className="flex items-center gap-2 text-emerald-200/80 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-3 w-3 rounded border-emerald-500/60 bg-[var(--glass-bg-strong)]/60 text-emerald-400 focus:ring-emerald-500/60"
                    checked={showUnredactedHighlights}
                    onChange={(e) => setShowUnredactedHighlights(e.target.checked)}
                  />
                  <LqText variant="xs">Highlight newly unredacted text</LqText>
                </label>
              </Flex>
            )}
            <button
              onClick={() => setShowAnnotations(!showAnnotations)}
              className={`px-3 py-1 text-xs rounded font-bold uppercase tracking-wider transition-all duration-300 ${
                showAnnotations
                  ? 'bg-[var(--accent)] text-[var(--bg-dark)] shadow-[0_0_15px_rgba(212,168,75,0.4)]'
                  : 'bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] border border-[var(--glass-border)] hover:bg-[var(--glass-border)]'
              }`}
            >
              {showAnnotations ? 'Hide Annotations' : 'Show Annotations'}
            </button>
          </Flex>
        )}
      </Flex>

      {/* Legend for unredacted highlighting */}
      {doc.unredaction_metrics?.baselineVocab && (
        <Box className="mb-4">
          <Flex align="center" gap="sm">
            <Box className="px-1.5 py-0.5 rounded bg-emerald-900/60 border border-emerald-500/50">
              <LqText variant="xs" weight="bold" className="text-emerald-100 uppercase">
                Newly unredacted
              </LqText>
            </Box>
            <LqText variant="xs" color="muted">
              Words highlighted in emerald were recovered during automated unredaction.
            </LqText>
          </Flex>
        </Box>
      )}

      {/* Email Headers Display */}
      {doc.evidenceType === 'email' &&
        (() => {
          let emailHeaders = doc.metadata?.emailHeaders;
          let emailBody = doc.content || '';

          if (!emailHeaders || (!emailHeaders.from && !emailHeaders.to && !emailHeaders.subject)) {
            const content = doc.content || '';
            const lines = content.split('\n').slice(0, 40);
            const headerText = lines.join('\n');

            const fromMatch = headerText.match(/^(?:from|sender):\s*(.+)$/im);
            const toMatch = headerText.match(/^to:\s*(.+)$/im);
            const ccMatch = headerText.match(/^cc:\s*(.+)$/im);
            const subjectMatch = headerText.match(/^(?:subject|re):\s*(.+)$/im);
            const dateMatch = headerText.match(/^(?:date|sent):\s*(.+)$/im);

            if (fromMatch || toMatch || subjectMatch) {
              emailHeaders = {
                from: fromMatch?.[1]?.trim(),
                to: toMatch?.[1]?.trim(),
                cc: ccMatch?.[1]?.trim(),
                subject: subjectMatch?.[1]?.trim(),
                sentDate: dateMatch?.[1]?.trim(),
              };

              let bodyStartIndex = 0;
              const contentLines = content.split('\n');
              for (let i = 0; i < Math.min(contentLines.length, 50); i++) {
                const line = contentLines[i].trim().toLowerCase();
                if (line === '' && i > 3) {
                  bodyStartIndex = i + 1;
                  break;
                }
                if (
                  i > 5 &&
                  !line.match(
                    /^(from|to|cc|bcc|subject|date|sent|message-id|reply-to|content-type):/i,
                  )
                ) {
                  bodyStartIndex = i;
                  break;
                }
              }
              if (bodyStartIndex > 0) {
                emailBody = contentLines.slice(bodyStartIndex).join('\n').trim();
              }
            }
          }

          if (emailHeaders && (emailHeaders.from || emailHeaders.to || emailHeaders.subject)) {
            return (
              <Box className="space-y-4 mb-6">
                <Surface variant="glass-strong" className="overflow-hidden">
                  <Flex
                    align="center"
                    gap="sm"
                    className="px-4 py-2 bg-[var(--glass-bg-highlight)] border-b border-[var(--glass-border)]"
                  >
                    <Mail className="w-4 h-4 text-[var(--accent)]" />
                    <LqText
                      variant="xs"
                      weight="bold"
                      color="secondary"
                      className="uppercase tracking-widest"
                    >
                      Email Message
                    </LqText>
                  </Flex>

                  <Box className="p-4 space-y-3">
                    {emailHeaders.subject && (
                      <LqText variant="h2" weight="bold" color="primary" className="mb-4">
                        {emailHeaders.subject}
                      </LqText>
                    )}

                    <Box className="space-y-2">
                      {emailHeaders.from && (
                        <Flex gap="md" align="start">
                          <LqText
                            variant="xs"
                            weight="bold"
                            color="muted"
                            className="w-14 uppercase"
                          >
                            From:
                          </LqText>
                          <LqText variant="small" color="primary">
                            {emailHeaders.from}
                          </LqText>
                        </Flex>
                      )}
                      {emailHeaders.to && (
                        <Flex gap="md" align="start">
                          <LqText
                            variant="xs"
                            weight="bold"
                            color="muted"
                            className="w-14 uppercase"
                          >
                            To:
                          </LqText>
                          <LqText variant="small" color="secondary">
                            {emailHeaders.to}
                          </LqText>
                        </Flex>
                      )}
                      {emailHeaders.cc && (
                        <Flex gap="md" align="start">
                          <LqText
                            variant="xs"
                            weight="bold"
                            color="muted"
                            className="w-14 uppercase"
                          >
                            Cc:
                          </LqText>
                          <LqText variant="small" color="muted">
                            {emailHeaders.cc}
                          </LqText>
                        </Flex>
                      )}
                      {emailHeaders.sentDate && (
                        <Flex gap="md" align="start">
                          <LqText
                            variant="xs"
                            weight="bold"
                            color="muted"
                            className="w-14 uppercase"
                          >
                            Date:
                          </LqText>
                          <LqText variant="small" color="muted">
                            {emailHeaders.sentDate}
                          </LqText>
                        </Flex>
                      )}
                    </Box>
                  </Box>
                </Surface>

                {emailBody && emailBody !== doc.content && (
                  <Surface variant="glass" className="p-5">
                    <pre className="whitespace-pre-wrap text-sm text-[var(--text-secondary)] font-sans leading-relaxed break-words outline-none">
                      {showRaw ? emailBody : prettifyOCRText(emailBody)}
                    </pre>
                  </Surface>
                )}
              </Box>
            );
          }

          return null;
        })()}

      {/* Legal Document Viewer */}
      {doc.evidenceType === 'legal' &&
        (() => {
          const content = doc.content || '';

          const caseNumberMatch = content.match(/Case\s*No\.?\s*:?\s*([\w\d\-:]+)/i);
          const courtMatch = content.match(
            /(?:IN THE|UNITED STATES)\s+(?:CIRCUIT COURT|DISTRICT COURT|COURT)[^\n]*/i,
          );
          const plaintiffMatch = content.match(
            /([A-Z][A-Z\s.,]+)\s*,?\s*(?:Plaintiff|Petitioner)/i,
          );
          const defendantMatch = content.match(
            /(?:v\.?s?\.?|versus)\s*\n?\s*([A-Z][A-Z\s.,]+)\s*,?\s*(?:Defendant|Respondent)?/i,
          );
          const filingDateMatch = content.match(/(?:E-Filed|Filed)\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
          const documentTypeMatch = content.match(
            /(MOTION|ORDER|COMPLAINT|REPLY|RESPONSE|MEMORANDUM|DECLARATION|SUBPOENA|SUMMONS)[^\n]*/i,
          );

          const hasParsedData = caseNumberMatch || courtMatch || plaintiffMatch || defendantMatch;

          if (hasParsedData) {
            return (
              <Box className="space-y-4 mb-6">
                <Surface
                  variant="glass-strong"
                  className="overflow-hidden border-amber-700/50 shadow-[0_0_20px_rgba(180,130,50,0.1)]"
                >
                  <Box className="bg-gradient-to-r from-amber-900/40 to-slate-800/80 px-4 py-3 border-b border-amber-700/30">
                    <Flex align="start" gap="md">
                      <Scale className="w-6 h-6 shrink-0 text-amber-300" />
                      <Box className="flex-1">
                        <LqText variant="h3" weight="bold" className="text-amber-200">
                          {courtMatch?.[0]?.trim() || 'Legal Document'}
                        </LqText>
                        {caseNumberMatch && (
                          <LqText variant="xs" className="text-amber-400/80 font-mono block mt-1">
                            CASE {caseNumberMatch[1]}
                          </LqText>
                        )}
                      </Box>
                    </Flex>
                  </Box>

                  {(plaintiffMatch || defendantMatch) && (
                    <Box className="p-4 border-t border-[var(--glass-border)] bg-amber-500/5">
                      <Flex gap="lg" align="stretch" className="flex-col md:flex-row">
                        {plaintiffMatch && (
                          <Box className="flex-1 bg-amber-900/10 p-4 rounded border border-amber-700/20">
                            <LqText
                              variant="xs"
                              weight="bold"
                              className="text-amber-400 uppercase block mb-1"
                            >
                              Plaintiff
                            </LqText>
                            <LqText variant="small" weight="bold" color="primary">
                              {plaintiffMatch[1].trim()}
                            </LqText>
                          </Box>
                        )}
                        <Flex align="center" justify="center" className="px-2">
                          <LqText variant="h3" weight="light" color="muted">
                            vs.
                          </LqText>
                        </Flex>
                        {defendantMatch && (
                          <Box className="flex-1 bg-amber-900/10 p-4 rounded border border-amber-700/20">
                            <LqText
                              variant="xs"
                              weight="bold"
                              className="text-amber-400 uppercase block mb-1"
                            >
                              Defendant
                            </LqText>
                            <LqText variant="small" weight="bold" color="primary">
                              {defendantMatch[1].trim()}
                            </LqText>
                          </Box>
                        )}
                      </Flex>
                    </Box>
                  )}

                  <Flex gap="md" className="px-4 pb-3">
                    {documentTypeMatch && (
                      <Box className="px-2 py-0.5 bg-amber-900/30 text-amber-200 border border-amber-700/30 rounded">
                        <LqText variant="xs" weight="bold">
                          {documentTypeMatch[1]}
                        </LqText>
                      </Box>
                    )}
                    {filingDateMatch && (
                      <Box className="px-2 py-0.5 bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] border border-[var(--glass-border)] rounded">
                        <LqText variant="xs" weight="bold">
                          FILED: {filingDateMatch[1]}
                        </LqText>
                      </Box>
                    )}
                  </Flex>
                </Surface>

                <Surface variant="glass" className="p-5">
                  <pre className="whitespace-pre-wrap text-sm text-[var(--text-secondary)] font-serif leading-relaxed break-words outline-none">
                    {showRaw ? content : prettifyOCRText(content)}
                  </pre>
                </Surface>
              </Box>
            );
          }
          return null;
        })()}

      {/* Deposition Viewer */}
      {doc.evidenceType === 'deposition' &&
        (() => {
          const content = doc.content || '';

          const caseMatch = content.match(/Case\s*(?:No\.?)?\s*:?\s*([\w\d\-:]+)/i);
          const witnessMatch = content.match(
            /(?:DEPOSITION OF|EXAMINATION OF|TESTIMONY OF)\s+([A-Z][A-Za-z\s.]+)/i,
          );
          const dateMatch = content.match(
            /(?:taken on|dated?)\s*:?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i,
          );

          const lines = content.split('\n');
          const qaContent: { type: 'q' | 'a' | 'text'; content: string }[] = [];
          let currentBlock = { type: 'text' as 'q' | 'a' | 'text', content: '' };

          for (const line of lines) {
            const isQuestion = /^\s*Q[:.]?\s/i.test(line);
            const isAnswer = /^\s*A[:.]?\s/i.test(line);

            if (isQuestion) {
              if (currentBlock.content) qaContent.push({ ...currentBlock });
              currentBlock = { type: 'q', content: line.replace(/^\s*Q[:.]?\s*/i, '') };
            } else if (isAnswer) {
              if (currentBlock.content) qaContent.push({ ...currentBlock });
              currentBlock = { type: 'a', content: line.replace(/^\s*A[:.]?\s*/i, '') };
            } else {
              currentBlock.content += '\n' + line;
            }
          }
          if (currentBlock.content) qaContent.push(currentBlock);

          const hasQA = qaContent.some((b) => b.type === 'q' || b.type === 'a');

          return (
            <Box className="space-y-4 mb-6">
              <Surface variant="glass-strong" className="overflow-hidden border-purple-700/50">
                <Box className="bg-gradient-to-r from-purple-900/40 to-slate-800/80 px-4 py-3 border-b border-purple-700/30">
                  <Flex align="center" gap="md">
                    <ScrollText className="w-6 h-6 text-purple-300" />
                    <Box>
                      <LqText variant="h3" weight="bold" className="text-purple-200">
                        {witnessMatch
                          ? `Deposition of ${witnessMatch[1].trim()}`
                          : 'Deposition Transcript'}
                      </LqText>
                      {caseMatch && (
                        <LqText variant="xs" className="text-purple-400/80 font-mono block mt-1">
                          CASE {caseMatch[1]}
                        </LqText>
                      )}
                    </Box>
                  </Flex>
                </Box>

                {dateMatch && (
                  <Box className="px-4 py-2 bg-purple-500/5">
                    <Flex align="center" gap="xs">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" />
                      <LqText variant="xs" weight="bold" color="muted">
                        {dateMatch[1]}
                      </LqText>
                    </Flex>
                  </Box>
                )}
              </Surface>

              {hasQA ? (
                <Box className="space-y-3">
                  {qaContent.map((block, idx) => (
                    <Box
                      key={idx}
                      className={`rounded-[var(--radius-lg)] p-4 border ${
                        block.type === 'q'
                          ? 'bg-blue-900/10 border-l-4 border-l-[var(--accent)] border-blue-900/30'
                          : block.type === 'a'
                            ? 'bg-emerald-900/10 border-l-4 border-l-emerald-500 border-emerald-900/30 ml-6'
                            : 'bg-[var(--glass-bg)]/30 border-[var(--glass-border)]'
                      }`}
                    >
                      {block.type !== 'text' && (
                        <LqText
                          variant="xs"
                          weight="bold"
                          className={`mb-2 block tracking-widest ${
                            block.type === 'q' ? 'text-[var(--accent)]' : 'text-emerald-400'
                          }`}
                        >
                          {block.type === 'q' ? 'QUESTION' : 'ANSWER'}
                        </LqText>
                      )}
                      <LqText
                        variant="body"
                        color="secondary"
                        className="whitespace-pre-wrap leading-relaxed"
                      >
                        {block.content.trim()}
                      </LqText>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Surface variant="glass" className="p-5">
                  <pre className="whitespace-pre-wrap text-sm text-[var(--text-secondary)] font-mono leading-relaxed break-words outline-none">
                    {showRaw ? content : prettifyOCRText(content)}
                  </pre>
                </Surface>
              )}
            </Box>
          );
        })()}

      {/* Article Viewer */}
      {doc.evidenceType === 'article' &&
        (() => {
          const content = doc.content || '';
          const lines = content.split('\n').filter((l: string) => l.trim());

          const dateMatch = content.match(
            /(\d{1,2}\/\d{1,2}\/\d{2,4})|([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/,
          );
          const bylineMatch = content.match(/(?:By|BY)\s+([A-Za-z\s.]+?)(?:\n|$)/);
          const sourceMatch = content.match(
            /(U\.?S\.?\s*News|New York|Daily News|Times|Post|Journal|Magazine|AVENUE|Tribune)/i,
          );

          const headline = lines.find(
            (l: string) => l.length > 20 && l.length < 200 && !/^\d|^http|^www/i.test(l),
          );
          const headlineIdx = headline ? lines.indexOf(headline) : -1;

          const bodyLines = headlineIdx >= 0 ? lines.slice(headlineIdx + 1) : lines;
          const body = bodyLines.join('\n\n');

          return (
            <Box className="space-y-6 mb-6">
              <Surface variant="glass-strong" className="overflow-hidden border-cyan-700/50">
                <Box className="bg-gradient-to-r from-cyan-900/40 to-slate-800/80 px-4 py-3 border-b border-cyan-700/30">
                  <Flex align="center" gap="md">
                    <Newspaper className="w-5 h-5 text-[var(--accent)]" />
                    <Flex align="center" gap="md">
                      {sourceMatch && (
                        <LqText
                          variant="small"
                          weight="bold"
                          className="text-cyan-200 uppercase tracking-widest"
                        >
                          {sourceMatch[1]}
                        </LqText>
                      )}
                      {dateMatch && (
                        <LqText variant="xs" weight="medium" color="muted">
                          • {dateMatch[0]}
                        </LqText>
                      )}
                    </Flex>
                  </Flex>
                </Box>

                {headline && (
                  <Box className="p-5">
                    <LqText
                      variant="display"
                      weight="bold"
                      color="primary"
                      className="mb-2 block leading-snug"
                    >
                      {headline}
                    </LqText>
                    {bylineMatch && (
                      <LqText variant="small" weight="bold" color="accent" className="italic">
                        By {bylineMatch[1].trim()}
                      </LqText>
                    )}
                  </Box>
                )}
              </Surface>

              <Surface variant="glass" className="p-8">
                <div className="prose prose-invert prose-lg max-w-none break-words">
                  {body.split('\n\n').map((para: string, idx: number) => (
                    <p
                      key={idx}
                      className="text-[var(--text-secondary)] leading-relaxed mb-6 first-letter:text-3xl first-letter:font-black first-letter:text-[var(--accent)] first-letter:mr-1"
                    >
                      {para.trim()}
                    </p>
                  ))}
                </div>
              </Surface>
            </Box>
          );
        })()}

      {/* Image Viewer for image files */}
      {doc.fileType?.match(/jpe?g|png|gif|bmp|webp/i) ? (
        <Flex direction="column" align="center" gap="lg" className="mb-6">
          <Surface variant="glass-strong" className="p-2 inline-block">
            <img
              src={`/api/documents/${doc.id}/file`}
              alt={doc.title}
              className="max-w-full max-h-[70vh] object-contain rounded-[var(--radius-lg)]"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const errorMsg = document.createElement('div');
                  errorMsg.className = 'p-12 text-center text-[var(--text-muted)] italic';
                  errorMsg.innerHTML =
                    '<span class="block mb-2">Image unavailable</span><pre class="text-xs">' +
                    (doc.content || '') +
                    '</pre>';
                  parent.appendChild(errorMsg);
                }
              }}
            />
          </Surface>
          {doc.content && doc.content.trim() && (
            <Surface variant="glass" className="w-full">
              <details className="group">
                <summary className="cursor-pointer p-4 flex items-center justify-between text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  <Flex align="center" gap="sm">
                    <Bot className="w-4 h-4" />
                    <LqText variant="small" weight="bold">
                      OCR EXTRACTED TEXT
                    </LqText>
                  </Flex>
                  <LqText variant="xs" color="muted">
                    ({doc.content.split(/\s+/).length} words)
                  </LqText>
                </summary>
                <Box className="p-4 pt-0 border-t border-[var(--glass-border)]">
                  <pre className="mt-4 whitespace-pre-wrap text-xs text-[var(--text-muted)] font-mono leading-relaxed max-h-64 overflow-y-auto break-words outline-none">
                    {showRaw ? doc.content : prettifyOCRText(doc.content)}
                  </pre>
                </Box>
              </details>
            </Surface>
          )}
        </Flex>
      ) : doc.fileType?.match(/csv|xls/i) || doc.evidenceType === 'financial' ? (
        /* CSV/Financial Table Viewer */
        <Box className="overflow-x-auto mb-6">
          <Surface variant="glass" className="p-4 mb-4">
            <Flex align="center" gap="sm">
              <Landmark className="w-4 h-4 text-emerald-400" />
              <LqText
                variant="xs"
                weight="bold"
                color="muted"
                className="uppercase tracking-widest"
              >
                Financial Data / Spreadsheet
              </LqText>
            </Flex>
          </Surface>

          {(() => {
            const lines = (doc.content || '').split('\n').filter((l: string) => l.trim());
            if (lines.length === 0)
              return (
                <LqText variant="body" color="muted" className="p-4 italic">
                  No data available
                </LqText>
              );

            const rows = lines.map((line: string) => line.split(/[,\t]/));
            const hasHeader = rows.length > 1;

            return (
              <table className="w-full text-sm text-left border-collapse bg-[var(--glass-bg)] rounded-[var(--radius-lg)] overflow-hidden">
                {hasHeader && (
                  <thead className="bg-[var(--glass-bg-strong)] text-[var(--text-secondary)] uppercase text-xs font-black tracking-widest">
                    <tr>
                      {rows[0].map((cell: string, i: number) => (
                        <th
                          key={i}
                          className="px-4 py-3 border border-[var(--glass-border)] whitespace-nowrap"
                        >
                          {cell.trim()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-[var(--glass-border)]">
                  {rows.slice(hasHeader ? 1 : 0).map((row: string[], rowIdx: number) => (
                    <tr
                      key={rowIdx}
                      className="hover:bg-[var(--glass-bg-highlight)] transition-colors"
                    >
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          className="px-4 py-2 border border-[var(--glass-border)] text-[var(--text-secondary)] whitespace-nowrap"
                        >
                          {cell.trim()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </Box>
      ) : showAnnotations ? (
        <DocumentAnnotationSystem
          documentId={String(doc.id)}
          content={doc.content}
          searchTerm={searchTerm}
          renderHighlightedText={renderHighlightedText}
        />
      ) : (
        <Box
          className={`grid gap-6 ${doc.originalFileUrl ? 'lg:grid-cols-2' : 'grid-cols-1'} mb-6`}
        >
          <Box className="space-y-4">
            <Flex align="center" justify="between">
              <LqText
                variant="xs"
                weight="bold"
                color="muted"
                className="uppercase tracking-widest"
              >
                Extracted Text
              </LqText>
              {doc.page_number && (
                <Box className="bg-[var(--glass-bg-highlight)] px-2 py-0.5 rounded border border-[var(--glass-border)]">
                  <LqText variant="xs" weight="bold" color="secondary">
                    PAGE {doc.page_number}
                  </LqText>
                </Box>
              )}
            </Flex>
            <Surface variant="glass-strong" className="p-0 overflow-hidden relative group">
              <pre
                className="whitespace-pre-wrap text-sm text-[var(--text-secondary)] font-mono leading-relaxed break-words p-6 min-h-[600px] overflow-y-auto max-h-[80vh] outline-none"
                dangerouslySetInnerHTML={{
                  __html: processedContent,
                }}
              />
            </Surface>
          </Box>

          {doc.originalFileUrl && (
            <Box className="space-y-4">
              <Flex align="center" justify="between">
                <LqText
                  variant="xs"
                  weight="bold"
                  color="muted"
                  className="uppercase tracking-widest"
                >
                  Original Document
                </LqText>
                <a
                  href={doc.originalFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 font-bold uppercase"
                >
                  Open Original ↗
                </a>
              </Flex>
              <Surface
                variant="glass-strong"
                className="h-[600px] max-h-[80vh] p-0 bg-white shadow-xl"
              >
                <iframe
                  src={`${doc.originalFileUrl}${doc.page_number ? `#page=${doc.page_number}` : ''}`}
                  className="w-full h-full border-none"
                  title="Original Document Content"
                />
              </Surface>
            </Box>
          )}
        </Box>
      )}

      {/* Related Entities Section */}
      {entities.length > 0 && (
        <Box className="mt-12 pt-8 border-t border-[var(--glass-border)]">
          <LqText
            variant="xs"
            weight="bold"
            color="muted"
            className="uppercase tracking-[0.2em] mb-6 block"
          >
            MENTIONS & RELATED ENTITIES
          </LqText>
          <Flex wrap="wrap" gap="sm">
            {(() => {
              if (!entities.length || entityRegexes.length === 0)
                return (
                  <LqText variant="small" color="muted" className="italic">
                    No entities detected yet.
                  </LqText>
                );

              const text = doc.content || '';
              const matches = new Set<string>();

              for (const regex of entityRegexes) {
                let match;
                regex.lastIndex = 0;
                while ((match = regex.exec(text)) !== null) {
                  matches.add(match[0].toLowerCase());
                  if (matches.size > 50) break;
                }
                if (matches.size > 50) break;
              }

              const found = entities.filter((e) => {
                const entityName = getEntityName(e);
                return entityName.length > 0 && matches.has(entityName.toLowerCase());
              });

              if (found.length === 0)
                return (
                  <LqText variant="small" color="muted" className="italic">
                    No entities detected in this text.
                  </LqText>
                );

              return found.map((e) => (
                <Box
                  key={String(e.id)}
                  onClick={(evt: React.MouseEvent) => {
                    evt.preventDefault();
                    const entityName = getEntityName(e);
                    const event = new CustomEvent('entityClick', {
                      detail: { id: e.id, name: entityName },
                    });
                    window.dispatchEvent(event);
                  }}
                  className="inline-flex items-center px-3 py-1 rounded-full bg-blue-900/20 text-blue-200 border border-[var(--accent)]/30 cursor-pointer hover:bg-blue-800/40 hover:border-[var(--accent)] hover:scale-105 transition-all duration-300 group"
                >
                  <LqText variant="xs" weight="bold" className="group-hover:text-white">
                    {getEntityName(e)}
                  </LqText>
                  {Boolean(e.entityType) && (
                    <LqText
                      variant="xs"
                      className="ml-2 opacity-50 uppercase tracking-tighter scale-90"
                    >
                      {String(e.entityType)}
                    </LqText>
                  )}
                </Box>
              ));
            })()}
          </Flex>
        </Box>
      )}
    </Box>
  );
};
