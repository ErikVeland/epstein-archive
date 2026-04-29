import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Icon from '@client/components/common/Icon';
import DOMPurify from 'isomorphic-dompurify';
import { DocumentAnnotationSystem } from './DocumentAnnotationSystem';
import { prettifyOCRText } from '@client/utils/prettifyOCR';
import { LqText } from '@client/design-system/components/typography/Text';
import { Flex } from '@client/design-system/components/layout/Flex';
import { Surface } from '@client/design-system/components/surfaces/Surface';
import { Box } from '@client/design-system/components/layout/Box';
import styles from './DocumentContentRenderer.module.css';

import { Button, Input } from '@client/design-system/lib';

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

const cx = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(' ');

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

  const highlightClass = styles.markHighlight;
  const unredactedClass = styles.markUnredacted;
  const entityLinkClass = styles.entityLink;

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
    sorted.forEach((entity) => {
      const name = getEntityName(entity);
      if (name && name.length > 3) {
        map.set(name.toLowerCase(), entity);
        terms.push(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      }
    });

    setEntityMap(map);

    const chunkSize = 200;
    const chunks: RegExp[] = [];
    for (let i = 0; i < terms.length; i += chunkSize) {
      const chunk = terms.slice(i, i + chunkSize);
      if (chunk.length > 0) {
        chunks.push(new RegExp(`\\b(${chunk.join('|')})\\b`, 'gi'));
      }
    }
    setEntityRegexes(chunks);
  }, [doc.entities, doc.mentionedEntities]);

  const highlightText = useCallback(
    (text: string, term?: string) => {
      if (!term || !text || typeof text !== 'string') return text;

      try {
        const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const terms = term.split(/\s+/).filter((token) => token.length > 2);

        if (terms.length === 0) {
          if (term.trim().length > 0) {
            const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
            return text.replace(regex, `<mark class="${highlightClass}">$1</mark>`);
          }
          return text;
        }

        const regex = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
        return text.replace(regex, `<mark class="${highlightClass}">$1</mark>`);
      } catch (error) {
        console.warn('Error highlighting text:', error);
        return text;
      }
    },
    [highlightClass],
  );

  const renderHighlightedText = useCallback((text: string, term?: string): React.ReactNode => {
    if (!term || !text) return text;

    try {
      const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const terms = term.split(/\s+/).filter((token) => token.length > 2);
      const pattern = terms.length > 0 ? terms.map(escapeRegExp).join('|') : escapeRegExp(term);
      if (!pattern) return text;

      const regex = new RegExp(`(${pattern})`, 'gi');
      const parts = text.split(regex);
      return (
        <span>
          {parts.map((part, index) =>
            regex.test(part) ? (
              <mark key={index} className={styles.markHighlight}>
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
          return `<span class="${entityLinkClass}" data-entity-id="${entity.id}" data-entity-name="${entityName}" title="Click to view entity details">${match}</span>`;
        });
      });

      return processedText;
    },
    [entityLinkClass, entityMap, entityRegexes],
  );

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('.' + styles.entityLink);
      if (!link) return;

      event.preventDefault();
      event.stopPropagation();

      const entityId = link.getAttribute('data-entity-id');
      const entityName = link.getAttribute('data-entity-name');

      if (entityId && entityName) {
        window.dispatchEvent(
          new CustomEvent('entityClick', {
            detail: { id: entityId, name: entityName },
          }),
        );
      }
    };

    document.body.addEventListener('click', handleClick);
    return () => document.body.removeEventListener('click', handleClick);
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
        for (const token of baselineVocab.split(/\s+/)) {
          const cleaned = token.trim().toLowerCase();
          if (cleaned) baselineTokens.add(cleaned);
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
                `<mark class="${unredactedClass}" title="Newly unredacted text">${escaped}</mark>`,
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
    } catch (error) {
      console.warn('Error applying unredaction baseline highlighting:', error);
    }

    const finalHtml = searchTerm
      ? highlightText(linkEntitiesInText(content), searchTerm)
      : linkEntitiesInText(content);

    return DOMPurify.sanitize(finalHtml, {
      USE_PROFILES: { html: true },
      ADD_TAGS: ['mark', 'span'],
      ADD_ATTR: ['class', 'data-entity-id', 'data-entity-name', 'title', 'target', 'rel'],
    });
  }, [
    doc.content,
    doc.contentRefined,
    doc.unredaction_metrics,
    highlightText,
    linkEntitiesInText,
    searchTerm,
    showRaw,
    showUnredactedHighlights,
    unredactedClass,
  ]);

  const isImageFile = Boolean(doc.fileType?.match(/jpe?g|png|gif|bmp|webp/i));
  const isTableLike = Boolean(doc.fileType?.match(/csv|xls/i) || doc.evidenceType === 'financial');
  const textColumnsClassName = cx(
    styles.textColumns,
    !doc.originalFileUrl && styles.textColumnsSingle,
  );

  const renderEmailSection = () => {
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
        for (let i = 0; i < Math.min(contentLines.length, 50); i += 1) {
          const line = contentLines[i].trim().toLowerCase();
          if (line === '' && i > 3) {
            bodyStartIndex = i + 1;
            break;
          }
          if (
            i > 5 &&
            !line.match(/^(from|to|cc|bcc|subject|date|sent|message-id|reply-to|content-type):/i)
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

    if (!emailHeaders || (!emailHeaders.from && !emailHeaders.to && !emailHeaders.subject)) {
      return null;
    }

    return (
      <Box className={cx(styles.stackMd, styles.section)}>
        <Surface variant="glass-strong" className={styles.surfaceHidden}>
          <Flex align="center" gap="sm" className={styles.headerBar}>
            <Icon name="Mail" className={styles.typeIcon} />
            <LqText variant="xs" weight="bold" color="secondary" className={styles.headerCaption}>
              Email Message
            </LqText>
          </Flex>

          <Box className={cx(styles.contentPad, styles.stackSm)}>
            {emailHeaders.subject && (
              <LqText variant="h2" weight="bold" color="primary" className={styles.titleSpacing}>
                {emailHeaders.subject}
              </LqText>
            )}

            <Box className={styles.stackXs}>
              {emailHeaders.from && (
                <Flex gap="md" align="start">
                  <LqText variant="xs" weight="bold" color="muted" className={styles.metaLabel}>
                    From:
                  </LqText>
                  <LqText variant="small" color="primary">
                    {emailHeaders.from}
                  </LqText>
                </Flex>
              )}
              {emailHeaders.to && (
                <Flex gap="md" align="start">
                  <LqText variant="xs" weight="bold" color="muted" className={styles.metaLabel}>
                    To:
                  </LqText>
                  <LqText variant="small" color="secondary">
                    {emailHeaders.to}
                  </LqText>
                </Flex>
              )}
              {emailHeaders.cc && (
                <Flex gap="md" align="start">
                  <LqText variant="xs" weight="bold" color="muted" className={styles.metaLabel}>
                    Cc:
                  </LqText>
                  <LqText variant="small" color="muted">
                    {emailHeaders.cc}
                  </LqText>
                </Flex>
              )}
              {emailHeaders.sentDate && (
                <Flex gap="md" align="start">
                  <LqText variant="xs" weight="bold" color="muted" className={styles.metaLabel}>
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
          <Surface variant="glass" className={styles.contentPad}>
            <pre className={styles.preSans}>{showRaw ? emailBody : prettifyOCRText(emailBody)}</pre>
          </Surface>
        )}
      </Box>
    );
  };

  const renderLegalSection = () => {
    const content = doc.content || '';
    const caseNumberMatch = content.match(/Case\s*No\.?\s*:?\s*([\w\d\-:]+)/i);
    const courtMatch = content.match(
      /(?:IN THE|UNITED STATES)\s+(?:CIRCUIT COURT|DISTRICT COURT|COURT)[^\n]*/i,
    );
    const plaintiffMatch = content.match(/([A-Z][A-Z\s.,]+)\s*,?\s*(?:Plaintiff|Petitioner)/i);
    const defendantMatch = content.match(
      /(?:v\.?s?\.?|versus)\s*\n?\s*([A-Z][A-Z\s.,]+)\s*,?\s*(?:Defendant|Respondent)?/i,
    );
    const filingDateMatch = content.match(/(?:E-Filed|Filed)\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    const documentTypeMatch = content.match(
      /(MOTION|ORDER|COMPLAINT|REPLY|RESPONSE|MEMORANDUM|DECLARATION|SUBPOENA|SUMMONS)[^\n]*/i,
    );

    if (!(caseNumberMatch || courtMatch || plaintiffMatch || defendantMatch)) {
      return null;
    }

    return (
      <Box className={cx(styles.stackMd, styles.section)}>
        <Surface variant="glass-strong" className={styles.legalCard}>
          <Box className={styles.legalHeader}>
            <Flex align="start" gap="md">
              <Icon name="Scale" className={styles.iconLarge} />
              <Box>
                <LqText variant="h3" weight="bold" className={styles.legalTitle}>
                  {courtMatch?.[0]?.trim() || 'Legal Document'}
                </LqText>
                {caseNumberMatch && (
                  <LqText variant="xs" className={styles.monoAmber}>
                    CASE {caseNumberMatch[1]}
                  </LqText>
                )}
              </Box>
            </Flex>
          </Box>

          {(plaintiffMatch || defendantMatch) && (
            <Box className={styles.legalParties}>
              <div className={styles.partyRow}>
                {plaintiffMatch && (
                  <Box className={styles.partyCard}>
                    <LqText variant="xs" weight="bold" className={styles.amberLabel}>
                      Plaintiff
                    </LqText>
                    <LqText variant="small" weight="bold" color="primary">
                      {plaintiffMatch[1].trim()}
                    </LqText>
                  </Box>
                )}
                <Flex align="center" justify="center" className={styles.vsWrap}>
                  <LqText variant="h3" weight="light" color="muted">
                    vs.
                  </LqText>
                </Flex>
                {defendantMatch && (
                  <Box className={styles.partyCard}>
                    <LqText variant="xs" weight="bold" className={styles.amberLabel}>
                      Defendant
                    </LqText>
                    <LqText variant="small" weight="bold" color="primary">
                      {defendantMatch[1].trim()}
                    </LqText>
                  </Box>
                )}
              </div>
            </Box>
          )}

          <Flex gap="md" className={styles.tagRow}>
            {documentTypeMatch && (
              <Box className={styles.amberTag}>
                <LqText variant="xs" weight="bold">
                  {documentTypeMatch[1]}
                </LqText>
              </Box>
            )}
            {filingDateMatch && (
              <Box className={styles.neutralTag}>
                <LqText variant="xs" weight="bold">
                  FILED: {filingDateMatch[1]}
                </LqText>
              </Box>
            )}
          </Flex>
        </Surface>

        <Surface variant="glass" className={styles.contentPad}>
          <pre className={styles.preSerif}>{showRaw ? content : prettifyOCRText(content)}</pre>
        </Surface>
      </Box>
    );
  };

  const renderDepositionSection = () => {
    const content = doc.content || '';
    const caseMatch = content.match(/Case\s*(?:No\.?)?\s*:?\s*([\w\d\-:]+)/i);
    const witnessMatch = content.match(
      /(?:DEPOSITION OF|EXAMINATION OF|TESTIMONY OF)\s+([A-Z][A-Za-z\s.]+)/i,
    );
    const dateMatch = content.match(
      /(?:taken on|dated?)\s*:?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    );

    const qaContent: Array<{ type: 'q' | 'a' | 'text'; content: string }> = [];
    let currentBlock: { type: 'q' | 'a' | 'text'; content: string } = {
      type: 'text',
      content: '',
    };

    for (const line of content.split('\n')) {
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

    const hasQA = qaContent.some((block) => block.type === 'q' || block.type === 'a');

    return (
      <Box className={cx(styles.stackMd, styles.section)}>
        <Surface variant="glass-strong" className={styles.depositionCard}>
          <Box className={styles.depositionHeader}>
            <Flex align="center" gap="md">
              <Icon name="ScrollText" className={styles.iconLarge} />
              <Box>
                <LqText variant="h3" weight="bold" className={styles.depositionTitle}>
                  {witnessMatch
                    ? `Deposition of ${witnessMatch[1].trim()}`
                    : 'Deposition Transcript'}
                </LqText>
                {caseMatch && (
                  <LqText variant="xs" className={styles.monoPurple}>
                    CASE {caseMatch[1]}
                  </LqText>
                )}
              </Box>
            </Flex>
          </Box>

          {dateMatch && (
            <Box className={styles.depositionDateBar}>
              <Flex align="center" gap="xs">
                <Icon name="Calendar" className={styles.purpleDateIcon} />
                <LqText variant="xs" weight="bold" color="muted">
                  {dateMatch[1]}
                </LqText>
              </Flex>
            </Box>
          )}
        </Surface>

        {hasQA ? (
          <Box className={styles.qaList}>
            {qaContent.map((block, index) => (
              <Box
                key={index}
                className={cx(
                  styles.qaBlock,
                  block.type === 'q'
                    ? styles.questionBlock
                    : block.type === 'a'
                      ? styles.answerBlock
                      : styles.textBlock,
                )}
              >
                {block.type !== 'text' && (
                  <LqText
                    variant="xs"
                    weight="bold"
                    className={block.type === 'q' ? styles.questionLabel : styles.answerLabel}
                  >
                    {block.type === 'q' ? 'QUESTION' : 'ANSWER'}
                  </LqText>
                )}
                <LqText variant="body" color="secondary" className={styles.preserveWrap}>
                  {block.content.trim()}
                </LqText>
              </Box>
            ))}
          </Box>
        ) : (
          <Surface variant="glass" className={styles.contentPad}>
            <pre className={styles.preMono}>{showRaw ? content : prettifyOCRText(content)}</pre>
          </Surface>
        )}
      </Box>
    );
  };

  const renderArticleSection = () => {
    const content = doc.content || '';
    const lines = content.split('\n').filter((line: string) => line.trim());
    const dateMatch = content.match(
      /(\d{1,2}\/\d{1,2}\/\d{2,4})|([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/,
    );
    const bylineMatch = content.match(/(?:By|BY)\s+([A-Za-z\s.]+?)(?:\n|$)/);
    const sourceMatch = content.match(
      /(U\.?S\.?\s*News|New York|Daily News|Times|Post|Journal|Magazine|AVENUE|Tribune)/i,
    );
    const headline = lines.find(
      (line: string) => line.length > 20 && line.length < 200 && !/^\d|^http|^www/i.test(line),
    );
    const headlineIdx = headline ? lines.indexOf(headline) : -1;
    const bodyLines = headlineIdx >= 0 ? lines.slice(headlineIdx + 1) : lines;
    const body = bodyLines.join('\n\n');

    return (
      <Box className={cx(styles.stackMd, styles.section)}>
        <Surface variant="glass-strong" className={styles.articleCard}>
          <Box className={styles.articleHeader}>
            <Flex align="center" gap="md">
              <Icon name="Newspaper" className={styles.iconMedium} />
              <Flex align="center" gap="md">
                {sourceMatch && (
                  <LqText variant="small" weight="bold" className={styles.articleSource}>
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
            <Box className={styles.articleContent}>
              <LqText
                variant="display"
                weight="bold"
                color="primary"
                className={styles.articleHeadline}
              >
                {headline}
              </LqText>
              {bylineMatch && (
                <LqText variant="small" weight="bold" color="accent" className={styles.byline}>
                  By {bylineMatch[1].trim()}
                </LqText>
              )}
            </Box>
          )}
        </Surface>

        <Surface variant="glass" className={styles.articleBody}>
          <div className={styles.articleProse}>
            {body.split('\n\n').map((paragraph: string, index: number) => (
              <p key={index} className={styles.articleParagraph}>
                {paragraph.trim()}
              </p>
            ))}
          </div>
        </Surface>
      </Box>
    );
  };

  const renderImageSection = () => (
    <Flex direction="column" align="center" gap="lg" className={styles.section}>
      <Surface variant="glass-strong" className={styles.imageShell}>
        <img
          src={`/api/documents/${encodeURIComponent(String(doc.id))}/file?variant=original`}
          alt={doc.title}
          className={styles.imagePreview}
          onError={(event) => {
            const target = event.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              const errorMsg = document.createElement('div');
              errorMsg.className = styles.imageError;
              errorMsg.innerHTML =
                `<span class="${styles.imageErrorLabel}">Image unavailable</span><pre class="${styles.preMonoCompact}">` +
                (doc.content || '') +
                '</pre>';
              parent.appendChild(errorMsg);
            }
          }}
        />
      </Surface>
      {doc.content && doc.content.trim() && (
        <Surface variant="glass" className={styles.fullWidth}>
          <details>
            <summary className={styles.detailsSummary}>
              <Flex align="center" gap="sm">
                <Icon name="Bot" className={styles.typeIcon} />
                <LqText variant="small" weight="bold">
                  OCR EXTRACTED TEXT
                </LqText>
              </Flex>
              <LqText variant="xs" color="muted">
                ({doc.content.split(/\s+/).length} words)
              </LqText>
            </summary>
            <Box className={styles.detailsBody}>
              <pre className={styles.preMonoCompact}>
                {showRaw ? doc.content : prettifyOCRText(doc.content)}
              </pre>
            </Box>
          </details>
        </Surface>
      )}
    </Flex>
  );

  const renderTableSection = () => {
    const lines = (doc.content || '').split('\n').filter((line: string) => line.trim());
    const rows = lines.map((line: string) => line.split(/[,\t]/));
    const hasHeader = rows.length > 1;

    return (
      <Box className={styles.tableWrap}>
        <Surface variant="glass" className={styles.tableHeader}>
          <Flex align="center" gap="sm">
            <Icon name="Landmark" className={styles.typeIcon} />
            <LqText variant="xs" weight="bold" color="muted" className={styles.tableTitle}>
              Financial Data / Spreadsheet
            </LqText>
          </Flex>
        </Surface>

        {lines.length === 0 ? (
          <LqText variant="body" color="muted" className={styles.contentPad}>
            No data available
          </LqText>
        ) : (
          <table className={styles.table}>
            {hasHeader && (
              <thead className={styles.tableHead}>
                <tr>
                  {rows[0].map((cell: string, index: number) => (
                    <th key={index} className={styles.tableHeaderCell}>
                      {cell.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.slice(hasHeader ? 1 : 0).map((row: string[], rowIdx: number) => (
                <tr key={rowIdx} className={styles.tableRow}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className={styles.tableCell}>
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Box>
    );
  };

  const renderDefaultTextSection = () => (
    <Box className={textColumnsClassName}>
      <Box className={styles.stackMd}>
        <Flex align="center" justify="between">
          <LqText variant="xs" weight="bold" color="muted" className={styles.headerCaption}>
            Extracted Text
          </LqText>
          {doc.page_number && (
            <Box className={styles.pageBadge}>
              <LqText variant="xs" weight="bold" color="secondary">
                PAGE {doc.page_number}
              </LqText>
            </Box>
          )}
        </Flex>
        <Surface variant="glass-strong" className={styles.textSurface}>
          <pre
            className={styles.textContent}
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        </Surface>
      </Box>

      {doc.originalFileUrl && (
        <Box className={styles.stackMd}>
          <Flex align="center" justify="between">
            <LqText variant="xs" weight="bold" color="muted" className={styles.headerCaption}>
              Original Document
            </LqText>
            <a
              href={doc.originalFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.openOriginal}
            >
              Open Original ↗
            </a>
          </Flex>
          <Surface variant="glass-strong" className={styles.iframeShell}>
            <iframe
              src={`${doc.originalFileUrl}${doc.page_number ? `#page=${doc.page_number}` : ''}`}
              className={styles.iframe}
              title="Original Document Content"
            />
          </Surface>
        </Box>
      )}
    </Box>
  );

  const renderEntitySection = () => {
    if (entities.length === 0) return null;

    return (
      <Box className={styles.entitiesSection}>
        <LqText variant="xs" weight="bold" color="muted" className={styles.entitiesHeading}>
          MENTIONS & RELATED ENTITIES
        </LqText>
        <Flex wrap="wrap" gap="sm">
          {(() => {
            if (!entities.length || entityRegexes.length === 0) {
              return (
                <LqText variant="small" color="muted" className={styles.entityFallback}>
                  No entities detected yet.
                </LqText>
              );
            }

            const matches = new Set<string>();
            const text = doc.content || '';

            for (const regex of entityRegexes) {
              let match: RegExpExecArray | null;
              regex.lastIndex = 0;
              while ((match = regex.exec(text)) !== null) {
                matches.add(match[0].toLowerCase());
                if (matches.size > 50) break;
              }
              if (matches.size > 50) break;
            }

            const found = entities.filter((entity) => {
              const entityName = getEntityName(entity);
              return entityName.length > 0 && matches.has(entityName.toLowerCase());
            });

            if (found.length === 0) {
              return (
                <LqText variant="small" color="muted" className={styles.entityFallback}>
                  No entities detected in this text.
                </LqText>
              );
            }

            return found.map((entity) => (
              <Box
                key={String(entity.id)}
                onClick={(event: React.MouseEvent) => {
                  event.preventDefault();
                  window.dispatchEvent(
                    new CustomEvent('entityClick', {
                      detail: { id: entity.id, name: getEntityName(entity) },
                    }),
                  );
                }}
                className={styles.entityChip}
              >
                <LqText variant="xs" weight="bold" className={styles.entityName}>
                  {getEntityName(entity)}
                </LqText>
                {Boolean(entity.entityType) && (
                  <LqText variant="xs" className={styles.entityType}>
                    {String(entity.entityType)}
                  </LqText>
                )}
              </Box>
            ));
          })()}
        </Flex>
      </Box>
    );
  };

  return (
    <Box className={styles.root}>
      <Flex align="center" justify="between" className={styles.toolbar}>
        <Flex align="center" gap="md">
          <Flex align="center" gap="sm" className={styles.toolbarMeta}>
            {doc.evidenceType === 'email' ? (
              <Icon name="Mail" className={styles.typeIcon} />
            ) : doc.evidenceType === 'legal' ? (
              <Icon name="Scale" className={styles.typeIcon} />
            ) : doc.evidenceType === 'deposition' ? (
              <Icon name="ScrollText" className={styles.typeIcon} />
            ) : doc.evidenceType === 'financial' ? (
              <Icon name="Landmark" className={styles.typeIcon} />
            ) : doc.fileType?.match(/jpe?g|png|gif|bmp|webp/i) ? (
              <Icon name="FileImage" className={styles.typeIcon} />
            ) : doc.fileType?.match(/csv|xls/i) ? (
              <Icon name="FileSpreadsheet" className={styles.typeIcon} />
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
            <Box className={styles.refinedBadge}>
              <Icon name="Bot" className={styles.iconSmall} />
              <span>AI Refined</span>
            </Box>
          )}
        </Flex>

        {!doc.fileType?.match(/jpe?g|png|gif|bmp|webp|csv|xls/i) && (
          <Flex align="center" gap="lg">
            {typeof doc.unredaction_metrics?.unredactedTextGain === 'number' && (
              <Flex align="center" gap="md" className={styles.unredactedControls}>
                <LqText variant="xs" weight="bold" className={styles.gainBadge}>
                  Unredacted gain:{' '}
                  {Math.round((doc.unredaction_metrics.unredactedTextGain || 0) * 100)}%
                </LqText>
                <label className={styles.checkboxLabel}>
                  <Input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={showUnredactedHighlights}
                    onChange={(event) => setShowUnredactedHighlights(event.target.checked)}
                  />
                  <LqText variant="xs">Highlight newly unredacted text</LqText>
                </label>
              </Flex>
            )}
            <Button
              unstyled
              onClick={() => setShowAnnotations(!showAnnotations)}
              className={cx(
                styles.toggleButton,
                showAnnotations ? styles.toggleButtonActive : styles.toggleButtonInactive,
              )}
            >
              {showAnnotations ? 'Hide Annotations' : 'Show Annotations'}
            </Button>
          </Flex>
        )}
      </Flex>

      {doc.unredaction_metrics?.baselineVocab && (
        <Box className={styles.legend}>
          <Flex align="center" gap="sm">
            <Box className={styles.legendChip}>
              <LqText variant="xs" weight="bold" className={styles.legendChipLabel}>
                Newly unredacted
              </LqText>
            </Box>
            <LqText variant="xs" color="muted">
              Words highlighted in emerald were recovered during automated unredaction.
            </LqText>
          </Flex>
        </Box>
      )}

      {doc.evidenceType === 'email' && renderEmailSection()}
      {doc.evidenceType === 'legal' && renderLegalSection()}
      {doc.evidenceType === 'deposition' && renderDepositionSection()}
      {doc.evidenceType === 'article' && renderArticleSection()}

      {isImageFile ? (
        renderImageSection()
      ) : isTableLike ? (
        renderTableSection()
      ) : showAnnotations ? (
        <DocumentAnnotationSystem
          documentId={String(doc.id)}
          content={doc.content}
          searchTerm={searchTerm}
          renderHighlightedText={renderHighlightedText}
        />
      ) : (
        renderDefaultTextSection()
      )}

      {renderEntitySection()}
    </Box>
  );
};
