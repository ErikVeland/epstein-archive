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
import { Document } from '../../types/documents';
import { DocumentAnnotationSystem } from './DocumentAnnotationSystem';
import { prettifyOCRText } from '../../utils/prettifyOCR';
import DOMPurify from 'isomorphic-dompurify';

interface DocumentContentRendererProps {
  document: Document | any; // Accept any for flexibility with legacy types
  searchTerm?: string;
  showRaw?: boolean;
}

export const DocumentContentRenderer: React.FC<DocumentContentRendererProps> = ({
  document: doc,
  searchTerm,
  showRaw = false,
}) => {
  const getEntityName = (entity: any): string =>
    String(entity?.full_name || entity?.fullName || entity?.name || '').trim();

  const [showAnnotations, setShowAnnotations] = useState(false);
  // Optimize entity lookup map
  const [entityMap, setEntityMap] = useState<Map<string, any>>(new Map());
  // TODO: Use entities for related entities sidebar - see UNUSED_VARIABLES_RECOMMENDATIONS.md
  const [_entities, setEntities] = useState<any[]>([]);
  const [entityRegexes, setEntityRegexes] = useState<RegExp[]>([]);
  const [showUnredactedHighlights, setShowUnredactedHighlights] = useState(true);

  // Process entities from the document object - instead of fetching all global entities
  useEffect(() => {
    const entityData = doc.entities || doc.mentionedEntities || [];
    if (entityData.length === 0) {
      setEntities([]);
      setEntityMap(new Map());
      setEntityRegexes([]);
      return;
    }

    setEntities(entityData);

    // Create lookup map and giant regex for single-pass replacement
    const map = new Map();
    // Sort by length desc to match longest names first
    const sorted = [...entityData].sort((a, b) => {
      const nameA = getEntityName(a);
      const nameB = getEntityName(b);
      return nameB.length - nameA.length;
    });

    const terms: string[] = [];
    sorted.forEach((e) => {
      const name = getEntityName(e);
      if (name && name.length > 3) {
        // Skip very short names to avoid noise
        map.set(name.toLowerCase(), e);
        terms.push(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      }
    });

    setEntityMap(map);

    // chunk regex if too large
    const CHUNK_SIZE = 200; // Smaller chunks for better performance with targeted entities
    const chunks: RegExp[] = [];
    for (let i = 0; i < terms.length; i += CHUNK_SIZE) {
      const chunk = terms.slice(i, i + CHUNK_SIZE);
      if (chunk.length > 0) {
        chunks.push(new RegExp(`\\b(${chunk.join('|')})\\b`, 'gi'));
      }
    }
    setEntityRegexes(chunks);
  }, [doc.entities, doc.mentionedEntities]);

  // Helper to highlight text
  const highlightText = useCallback((text: string, term?: string) => {
    if (!term || !text || typeof text !== 'string') return text;

    try {
      const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Only highlight words > 2 chars
      const terms = term.split(/\s+/).filter((t) => t.length > 2);

      if (terms.length === 0) {
        if (term.trim().length > 0) {
          const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
          return text.replace(
            regex,
            '<mark class="bg-yellow-500 text-black px-1 rounded">$1</mark>',
          );
        }
        return text;
      }

      const pattern = `(${terms.map(escapeRegExp).join('|')})`;
      const regex = new RegExp(pattern, 'gi');
      return text.replace(regex, '<mark class="bg-yellow-500 text-black px-1 rounded">$1</mark>');
    } catch (e) {
      console.warn('Error highlighting text:', e);
      return text;
    }
  }, []);

  const renderHighlightedText = useCallback(
    (text: string, term?: string) => {
      if (!term) return text;
      return <span dangerouslySetInnerHTML={{ __html: highlightText(text, term) }} />;
    },
    [highlightText],
  );

  // Optimized Helper function to link entities in text
  const linkEntitiesInText = useCallback(
    (text: string) => {
      if (!text || entityRegexes.length === 0 || entityMap.size === 0) return text;

      let processedText = text;
      // Apply each chunk sequentially
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

  // Add event listener for entity links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Handle clicks on spans within the dangerous HTML
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

    const container = document.body; // or specific container if ref available
    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, []);

  // Memoize processed content to avoid re-computation on every render
  const processedContent = useMemo(() => {
    // Use contentRefined if available and not showing raw, otherwise use content
    const rawText = doc.contentRefined && !showRaw ? doc.contentRefined : doc.content;
    // Apply prettifyOCRText unless showRaw is true
    const baseContent = showRaw ? rawText : prettifyOCRText(rawText);

    // Step 1: Apply unredaction token highlighting (baseline diff)
    let content = baseContent as string;
    try {
      const baselineVocab: string | null | undefined = doc.unredaction_metrics?.baselineVocab;
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

        // Tokenize content and wrap tokens not present in baseline
        const parts: string[] = [];
        const tokenRegex = /([A-Za-z0-9']+|[^A-Za-z0-9']+)/g;
        let match: RegExpExecArray | null;
        while ((match = tokenRegex.exec(content)) !== null) {
          const fragment = match[0];
          if (/^[A-Za-z0-9']+$/.test(fragment)) {
            const key = fragment.toLowerCase();
            if (!baselineTokens.has(key)) {
              // Newly-unredacted token; wrap in subtle highlight
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

    // Step 2: Apply entity linking (now optimized single-pass)
    // Only run linking if we have the regex ready
    const contentWithEntities = entityRegexes.length > 0 ? linkEntitiesInText(content) : content;

    // Step 3: Apply search term highlighting on top
    const finalHtml = searchTerm
      ? highlightText(contentWithEntities, searchTerm)
      : contentWithEntities;

    // SANITIZE: Ensure no XSS from source content while allowing our annotations
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
    <div className="prose prose-invert max-w-none">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-sm text-gray-400 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5">
            {doc.evidenceType === 'email' ? (
              <Mail className="w-4 h-4 text-cyan-400" />
            ) : doc.evidenceType === 'legal' ? (
              <Scale className="w-4 h-4 text-cyan-400" />
            ) : doc.evidenceType === 'deposition' ? (
              <ScrollText className="w-4 h-4 text-cyan-400" />
            ) : doc.evidenceType === 'financial' ? (
              <Landmark className="w-4 h-4 text-cyan-400" />
            ) : doc.fileType?.match(/jpe?g|png|gif|bmp|webp/i) ? (
              <FileImage className="w-4 h-4 text-cyan-400" />
            ) : doc.fileType?.match(/csv|xls/i) ? (
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            ) : null}
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
                        : 'Select text to add annotations and evidence'}
          </span>
          {doc.contentRefined && !showRaw && (
            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-purple-900/40 text-purple-300 border border-purple-500/40">
              <Bot className="w-3 h-3 inline mr-1" />
              AI Refined
            </span>
          )}
        </div>
        {!doc.fileType?.match(/jpe?g|png|gif|bmp|webp|csv|xls/i) && (
          <div className="flex items-center gap-3">
            {typeof doc.unredaction_metrics?.unredactedTextGain === 'number' && (
              <div className="text-xs text-emerald-400 flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-900/40 border border-emerald-500/40">
                  Unredacted gain:{' '}
                  {Math.round((doc.unredaction_metrics.unredactedTextGain || 0) * 100)}%
                </span>
                <label className="inline-flex items-center gap-1 text-emerald-200/80 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-3 w-3 rounded border-emerald-500/60 bg-slate-900/60 text-emerald-400 focus:ring-emerald-500/60"
                    checked={showUnredactedHighlights}
                    onChange={(e) => setShowUnredactedHighlights(e.target.checked)}
                  />
                  <span className="text-[11px]">Highlight newly unredacted text</span>
                </label>
              </div>
            )}
            <button
              onClick={() => setShowAnnotations(!showAnnotations)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                showAnnotations
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {showAnnotations ? 'Hide Annotations' : 'Show Annotations'}
            </button>
          </div>
        )}
      </div>

      {/* Legend for unredacted highlighting */}
      {doc.unredaction_metrics?.baselineVocab && (
        <div className="mb-3 text-[11px] text-emerald-200/80 flex items-center gap-2">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-900/60 border border-emerald-500/50 text-emerald-100">
            Newly unredacted
          </span>
          <span className="text-emerald-100/70">
            Words highlighted in emerald were recovered during automated unredaction compared with
            the original OCR text.
          </span>
        </div>
      )}

      {/* Email Headers Display */}
      {doc.evidenceType === 'email' &&
        (() => {
          // Try to get email headers from metadata, or parse from content
          let emailHeaders = doc.metadata?.emailHeaders;
          let emailBody = doc.content || '';

          // If no emailHeaders in metadata, try to parse from content
          if (!emailHeaders || (!emailHeaders.from && !emailHeaders.to && !emailHeaders.subject)) {
            const content = doc.content || '';
            const lines = content.split('\n').slice(0, 40);
            const headerText = lines.join('\n');

            // Parse common email header patterns
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

              // Extract email body (everything after headers)
              // Find the first blank line after headers or after the date line
              let bodyStartIndex = 0;
              const contentLines = content.split('\n');
              for (let i = 0; i < Math.min(contentLines.length, 50); i++) {
                const line = contentLines[i].trim().toLowerCase();
                if (line === '' && i > 3) {
                  bodyStartIndex = i + 1;
                  break;
                }
                // Also stop at common body start patterns
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

          // If we have email headers, show the email client UI
          if (emailHeaders && (emailHeaders.from || emailHeaders.to || emailHeaders.subject)) {
            return (
              <>
                {/* Mock Email Client Header */}
                <div className="bg-slate-800 rounded-lg border border-slate-600 mb-4 overflow-hidden">
                  {/* Email toolbar */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-700 border-b border-slate-600">
                    <Mail className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-slate-300 font-medium">Email Message</span>
                  </div>

                  {/* Headers */}
                  <div className="p-4 space-y-2">
                    {emailHeaders.subject && (
                      <div className="text-lg font-semibold text-white mb-3">
                        {emailHeaders.subject}
                      </div>
                    )}

                    {emailHeaders.from && (
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 text-sm w-14 shrink-0">From:</span>
                        <span className="text-white text-sm">{emailHeaders.from}</span>
                      </div>
                    )}
                    {emailHeaders.to && (
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 text-sm w-14 shrink-0">To:</span>
                        <span className="text-slate-300 text-sm">{emailHeaders.to}</span>
                      </div>
                    )}
                    {emailHeaders.cc && (
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 text-sm w-14 shrink-0">Cc:</span>
                        <span className="text-slate-400 text-sm">{emailHeaders.cc}</span>
                      </div>
                    )}
                    {emailHeaders.sentDate && (
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 text-sm w-14 shrink-0">Date:</span>
                        <span className="text-slate-400 text-sm">{emailHeaders.sentDate}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Email Body - show separated from headers */}
                {emailBody && emailBody !== doc.content && (
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed break-words">
                      {showRaw ? emailBody : prettifyOCRText(emailBody)}
                    </pre>
                  </div>
                )}
              </>
            );
          }

          return null;
        })()}

      {/* Legal Document Viewer */}
      {doc.evidenceType === 'legal' &&
        (() => {
          const content = doc.content || '';

          // Parse legal document patterns
          const caseNumberMatch = content.match(/Case\s*No\.?\s*:?\s*([\w\d\-:]+)/i);
          const courtMatch = content.match(
            /(?:IN THE|UNITED STATES)\s+(?:CIRCUIT COURT|DISTRICT COURT|COURT)[^\n]*/i,
          );
          const plaintiffMatch = content.match(
            /([A-Z][A-Z\s\.\,]+)\s*,?\s*(?:Plaintiff|Petitioner)/i,
          );
          const defendantMatch = content.match(
            /(?:v\.?s?\.?|versus)\s*\n?\s*([A-Z][A-Z\s\.\,]+)\s*,?\s*(?:Defendant|Respondent)?/i,
          );
          const filingDateMatch = content.match(/(?:E-Filed|Filed)\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
          const documentTypeMatch = content.match(
            /(MOTION|ORDER|COMPLAINT|REPLY|RESPONSE|MEMORANDUM|DECLARATION|SUBPOENA|SUMMONS)[^\n]*/i,
          );

          const hasParsedData = caseNumberMatch || courtMatch || plaintiffMatch || defendantMatch;

          if (hasParsedData) {
            return (
              <>
                {/* Legal Document Header */}
                <div className="bg-slate-800 rounded-lg border border-amber-700/50 mb-4 overflow-hidden">
                  {/* Court banner */}
                  <div className="bg-gradient-to-r from-amber-900/50 to-slate-800 px-4 py-3 border-b border-amber-700/30">
                    <div className="flex items-start gap-3">
                      <Scale className="w-6 h-6 shrink-0 text-amber-300" />
                      <div className="min-w-0 flex-1">
                        <div className="text-amber-200 font-semibold text-sm break-words">
                          {courtMatch?.[0]?.trim() || 'Legal Document'}
                        </div>
                        {caseNumberMatch && (
                          <div className="text-amber-400/70 text-xs font-mono mt-1">
                            Case {caseNumberMatch[1]}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Parties */}
                  {(plaintiffMatch || defendantMatch) && (
                    <div className="p-4 border-t border-slate-700">
                      <div className="flex flex-col md:flex-row gap-4 items-stretch">
                        {plaintiffMatch && (
                          <div className="flex-1 bg-slate-900/50 p-4 rounded border border-slate-700">
                            <div className="text-xs text-amber-400 uppercase mb-2 font-semibold">
                              Plaintiff
                            </div>
                            <div className="text-white font-medium">{plaintiffMatch[1].trim()}</div>
                          </div>
                        )}
                        <div className="flex items-center justify-center px-4">
                          <span className="text-slate-500 text-xl font-light">vs.</span>
                        </div>
                        {defendantMatch && (
                          <div className="flex-1 bg-slate-900/50 p-4 rounded border border-slate-700">
                            <div className="text-xs text-amber-400 uppercase mb-2 font-semibold">
                              Defendant
                            </div>
                            <div className="text-white font-medium">{defendantMatch[1].trim()}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Document type and date */}
                  <div className="px-4 pb-3 flex flex-wrap gap-2">
                    {documentTypeMatch && (
                      <span className="px-2 py-1 bg-amber-900/30 text-amber-200 text-xs rounded">
                        {documentTypeMatch[1]}
                      </span>
                    )}
                    {filingDateMatch && (
                      <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded">
                        Filed: {filingDateMatch[1]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Document Body */}
                <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
                  <pre className="whitespace-pre-wrap text-sm text-slate-300 font-serif leading-relaxed break-words">
                    {showRaw ? content : prettifyOCRText(content)}
                  </pre>
                </div>
              </>
            );
          }
          return null;
        })()}

      {/* Deposition Viewer */}
      {doc.evidenceType === 'deposition' &&
        (() => {
          const content = doc.content || '';

          // Parse deposition patterns
          const caseMatch = content.match(/Case\s*(?:No\.?)?\s*:?\s*([\w\d\-:]+)/i);
          const witnessMatch = content.match(
            /(?:DEPOSITION OF|EXAMINATION OF|TESTIMONY OF)\s+([A-Z][A-Za-z\s\.]+)/i,
          );
          const dateMatch = content.match(
            /(?:taken on|dated?)\s*:?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i,
          );

          // Parse Q&A content
          const lines = content.split('\n');
          const qaContent: { type: 'q' | 'a' | 'text'; content: string }[] = [];
          let currentBlock = { type: 'text' as 'q' | 'a' | 'text', content: '' };

          for (const line of lines) {
            const isQuestion = /^\s*Q[:\.]?\s/i.test(line);
            const isAnswer = /^\s*A[:\.]?\s/i.test(line);

            if (isQuestion) {
              if (currentBlock.content) qaContent.push({ ...currentBlock });
              currentBlock = { type: 'q', content: line.replace(/^\s*Q[:\.]?\s*/i, '') };
            } else if (isAnswer) {
              if (currentBlock.content) qaContent.push({ ...currentBlock });
              currentBlock = { type: 'a', content: line.replace(/^\s*A[:\.]?\s*/i, '') };
            } else {
              currentBlock.content += '\n' + line;
            }
          }
          if (currentBlock.content) qaContent.push(currentBlock);

          const hasQA = qaContent.some((b) => b.type === 'q' || b.type === 'a');

          return (
            <>
              {/* Deposition Header */}
              <div className="bg-slate-800 rounded-lg border border-purple-700/50 mb-4 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-900/50 to-slate-800 px-4 py-3 border-b border-purple-700/30">
                  <div className="flex items-center gap-2">
                    <ScrollText className="w-6 h-6 text-purple-300" />
                    <div>
                      <div className="text-purple-200 font-semibold text-sm">
                        {witnessMatch
                          ? `Deposition of ${witnessMatch[1].trim()}`
                          : 'Deposition Transcript'}
                      </div>
                      {caseMatch && (
                        <div className="text-purple-400/70 text-xs font-mono">
                          Case {caseMatch[1]}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {dateMatch && (
                  <div className="px-4 py-2 text-xs text-slate-400 inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {dateMatch[1]}
                  </div>
                )}
              </div>

              {/* Q&A Content */}
              {hasQA ? (
                <div className="space-y-3">
                  {qaContent.map((block, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg p-3 ${
                        block.type === 'q'
                          ? 'bg-blue-900/20 border-l-4 border-blue-500'
                          : block.type === 'a'
                            ? 'bg-green-900/20 border-l-4 border-green-500 ml-4'
                            : 'bg-slate-800/50'
                      }`}
                    >
                      {block.type !== 'text' && (
                        <div
                          className={`text-xs font-semibold mb-1 ${
                            block.type === 'q' ? 'text-blue-400' : 'text-green-400'
                          }`}
                        >
                          {block.type === 'q' ? 'QUESTION' : 'ANSWER'}
                        </div>
                      )}
                      <div className="text-sm text-slate-300 whitespace-pre-wrap break-words">
                        {block.content.trim()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
                  <pre className="whitespace-pre-wrap text-sm text-slate-300 font-mono leading-relaxed break-words">
                    {showRaw ? content : prettifyOCRText(content)}
                  </pre>
                </div>
              )}
            </>
          );
        })()}

      {/* Article Viewer */}
      {doc.evidenceType === 'article' &&
        (() => {
          const content = doc.content || '';
          const lines = content.split('\n').filter((l: string) => l.trim());

          // Try to extract article metadata
          const dateMatch = content.match(
            /(\d{1,2}\/\d{1,2}\/\d{2,4})|([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/,
          );
          const bylineMatch = content.match(/(?:By|BY)\s+([A-Za-z\s\.]+?)(?:\n|$)/);
          const sourceMatch = content.match(
            /(U\.?S\.?\s*News|New York|Daily News|Times|Post|Journal|Magazine|AVENUE|Tribune)/i,
          );

          // First substantial line is likely headline
          const headline = lines.find(
            (l: string) => l.length > 20 && l.length < 200 && !/^\d|^http|^www/i.test(l),
          );
          const headlineIdx = headline ? lines.indexOf(headline) : -1;

          // Body starts after headline
          const bodyLines = headlineIdx >= 0 ? lines.slice(headlineIdx + 1) : lines;
          const body = bodyLines.join('\n\n');

          return (
            <>
              {/* Article Header */}
              <div className="bg-slate-800 rounded-lg border border-cyan-700/50 mb-4 overflow-hidden">
                {/* Source bar */}
                <div className="bg-gradient-to-r from-cyan-900/50 to-slate-800 px-4 py-2 border-b border-cyan-700/30 flex items-center gap-3">
                  <Newspaper className="w-5 h-5 text-cyan-300" />
                  {sourceMatch && (
                    <span className="text-cyan-300 font-medium text-sm">{sourceMatch[1]}</span>
                  )}
                  {dateMatch && <span className="text-slate-400 text-xs">• {dateMatch[0]}</span>}
                </div>

                {/* Headline */}
                {headline && (
                  <div className="p-4">
                    <h2 className="text-xl md:text-2xl font-bold text-white leading-tight mb-2">
                      {headline}
                    </h2>
                    {bylineMatch && (
                      <div className="text-cyan-400 text-sm">By {bylineMatch[1].trim()}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Article Body */}
              <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
                <div className="prose prose-invert prose-lg max-w-none break-words">
                  {body.split('\n\n').map((para: string, idx: number) => (
                    <p
                      key={idx}
                      className="text-slate-300 leading-relaxed mb-4 first-letter:text-2xl first-letter:font-bold first-letter:text-cyan-400"
                    >
                      {para.trim()}
                    </p>
                  ))}
                </div>
              </div>
            </>
          );
        })()}

      {/* Image Viewer for image files */}
      {doc.fileType?.match(/jpe?g|png|gif|bmp|webp/i) ? (
        <div className="flex flex-col items-center">
          <img
            src={`/api/documents/${doc.id}/file`}
            alt={doc.title}
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
            onError={(e) => {
              // Fallback to showing OCR text if image fails to load
              (e.target as HTMLImageElement).style.display = 'none';
              const parent = (e.target as HTMLImageElement).parentElement;
              if (parent) {
                const pre = document.createElement('pre');
                pre.className =
                  'whitespace-pre-wrap text-sm text-gray-300 font-mono leading-relaxed break-words';
                pre.textContent = doc.content || 'No content available';
                parent.appendChild(pre);
              }
            }}
          />
          {doc.content && doc.content.trim() && (
            <div className="mt-4 w-full">
              <details className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <summary className="cursor-pointer text-sm text-gray-400 hover:text-white">
                  OCR Extracted Text ({doc.content.split(/\s+/).length} words)
                </summary>
                <pre className="mt-4 whitespace-pre-wrap text-xs text-gray-400 font-mono leading-relaxed max-h-48 overflow-y-auto break-words">
                  {showRaw ? doc.content : prettifyOCRText(doc.content)}
                </pre>
              </details>
            </div>
          )}
        </div>
      ) : doc.fileType?.match(/csv|xls/i) || doc.evidenceType === 'financial' ? (
        /* CSV/Financial Table Viewer */
        <div className="overflow-x-auto">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Landmark className="w-4 h-4" />
              <span>Financial Data / Spreadsheet</span>
            </div>
          </div>
          {(() => {
            const lines = (doc.content || '').split('\n').filter((l: string) => l.trim());
            if (lines.length === 0) return <p className="text-gray-400">No data available</p>;

            // Try to parse as CSV
            const rows = lines.map((line: string) => line.split(/[,\t]/));
            const hasHeader = rows.length > 1;

            return (
              <table className="w-full text-sm text-left border-collapse">
                {hasHeader && (
                  <thead className="bg-gray-800 text-gray-300 uppercase text-xs">
                    <tr>
                      {rows[0].map((cell: string, i: number) => (
                        <th key={i} className="px-4 py-3 border border-gray-700 whitespace-nowrap">
                          {cell.trim()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {rows.slice(hasHeader ? 1 : 0).map((row: string[], rowIdx: number) => (
                    <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}>
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          className="px-4 py-2 border border-gray-700 text-gray-300 whitespace-nowrap"
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
        </div>
      ) : showAnnotations ? (
        <DocumentAnnotationSystem
          documentId={doc.id}
          content={doc.content}
          searchTerm={searchTerm}
          renderHighlightedText={renderHighlightedText}
        />
      ) : (
        <div className={`grid gap-6 ${doc.originalFileUrl ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-400">Extracted Text</h3>
              {doc.page_number && (
                <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">
                  Page {doc.page_number}
                </span>
              )}
            </div>
            <pre
              className="whitespace-pre-wrap text-sm text-gray-300 font-mono leading-relaxed break-words bg-gray-900/50 p-4 rounded-lg border border-gray-700/50 min-h-[600px] overflow-y-auto max-h-[80vh]"
              dangerouslySetInnerHTML={{
                __html: processedContent,
              }}
            />
          </div>

          {doc.originalFileUrl && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-400">Original Document</h3>
                <a
                  href={doc.originalFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  Open in New Tab ↗
                </a>
              </div>
              <div className="bg-white rounded-lg border border-gray-700 overflow-hidden h-full min-h-[600px] max-h-[80vh]">
                <iframe
                  src={`${doc.originalFileUrl}${doc.page_number ? `#page=${doc.page_number}` : ''}`}
                  className="w-full h-full border-none"
                  title="Original Document Content"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Related Entities Section (Surfaced Feature) */}
      {_entities.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-700">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">
            Mentions & Related Entities
          </h3>
          <div className="flex flex-wrap gap-2">
            {(() => {
              // Optimization: Only regex match if we have entities
              if (!_entities.length || entityRegexes.length === 0)
                return <span className="text-gray-500 text-xs">No entities detected yet.</span>;

              // Find unique entities present in content
              // We use the same regex used for highlighting/linking
              const text = doc.content || '';
              const matches = new Set<string>();

              // Iterate over all chunks
              for (const regex of entityRegexes) {
                let match;
                regex.lastIndex = 0;
                // We limit to first 50 unique matches to avoid perf kill on huge docs
                while ((match = regex.exec(text)) !== null) {
                  matches.add(match[0].toLowerCase());
                  if (matches.size > 50) break;
                }
                if (matches.size > 50) break;
              }

              const found = _entities.filter((e) => {
                const entityName = getEntityName(e);
                return entityName.length > 0 && matches.has(entityName.toLowerCase());
              });

              if (found.length === 0)
                return (
                  <span className="text-gray-500 text-xs">No entities detected in this text.</span>
                );

              return found.map((e) => (
                <span
                  key={e.id}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-200 border border-blue-500/30 cursor-pointer hover:bg-blue-800 transition-colors"
                  onClick={(evt) => {
                    evt.preventDefault();
                    const entityName = getEntityName(e);
                    const event = new CustomEvent('entityClick', {
                      detail: { id: e.id, name: entityName },
                    });
                    window.dispatchEvent(event);
                  }}
                >
                  {getEntityName(e)}
                  {e.entity_type && (
                    <span className="ml-1.5 opacity-50 text-[10px] uppercase">{e.entity_type}</span>
                  )}
                </span>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
