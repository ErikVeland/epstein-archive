import { useEffect, useId, useRef, useState } from 'react';
import Icon from '@client/components/common/Icon';
import { AddToInvestigationButton } from '@client/components/common/AddToInvestigationButton';
import { Badge, Button, Surface } from '@client/design-system/lib';
import styles from './PassageSearchResults.module.css';

export interface PassageSearchResult {
  citationId: string;
  citationSchema: string;
  documentId: string;
  sentenceId: string | null;
  sentenceIndex: number;
  pageId: string | null;
  pageNumber: number | null;
  quote: string;
  snippet: string;
  documentTitle: string;
  fileName: string;
  sourceCollection: string | null;
  sourceRelease: string | null;
  sourceFamily: string;
  assetId: string | null;
  assetSha256: string | null;
  documentRevisionHash: string;
  documentSha256: string | null;
  textSha256: string;
  textStart: number | null;
  textEnd: number | null;
  quoteOccurrence: number | null;
  scanBbox: Record<string, unknown> | number[] | null;
  ocrConfidence: number | null;
  provenanceStatus: string | null;
  evidenceType: string | null;
  redFlagRating: number | null;
  textUrl: string;
  scanUrl: string;
  matchReason: string;
}

interface PassageSearchResultsProps {
  passages: PassageSearchResult[];
  searchTerm: string;
  onDocumentClick?: (documentId: string) => void;
}

interface CopyStatus {
  key: string;
  message: string;
  succeeded: boolean;
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  try {
    textarea.select();
    if (!document.execCommand('copy')) throw new Error('Copy command failed');
  } finally {
    document.body.removeChild(textarea);
  }
}

function shareableUrl(value: string): string {
  if (!value) return '';
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function formatOcrConfidence(confidence: number | null): string {
  if (confidence === null || !Number.isFinite(confidence)) return 'OCR confidence not recorded';
  const percentage = confidence <= 1 ? confidence * 100 : confidence;
  return `OCR confidence ${Math.round(Math.max(0, Math.min(100, percentage)))}%`;
}

function sourceLabel(passage: PassageSearchResult): string {
  const parts = Array.from(
    new Set([passage.sourceRelease, passage.sourceCollection].filter(Boolean)),
  );
  return parts.length > 0 ? parts.join(' · ') : 'Release and collection not recorded';
}

function buildCitation(passage: PassageSearchResult): string {
  const title = passage.documentTitle || passage.fileName || `Document ${passage.documentId}`;
  const page = passage.pageNumber === null ? 'page not recorded' : `p. ${passage.pageNumber}`;
  const quote = passage.quote || passage.snippet;
  const parts = [
    `“${quote}”`,
    `${title}, ${page}.`,
    `Source: ${sourceLabel(passage)}.`,
    `Evidence citation: ${passage.citationId} (${passage.citationSchema}).`,
    `Sentence index: ${passage.sentenceIndex}.`,
  ];

  const sourceHash = passage.assetSha256 || passage.documentSha256;
  if (sourceHash) parts.push(`Source SHA-256: ${sourceHash}.`);
  if (passage.documentRevisionHash) {
    parts.push(`Document revision: ${passage.documentRevisionHash}.`);
  }
  if (passage.textSha256) parts.push(`Text SHA-256: ${passage.textSha256}.`);
  if (passage.sourceFamily) parts.push(`Source family: ${passage.sourceFamily}.`);
  const url = shareableUrl(passage.textUrl || passage.scanUrl);
  if (url) parts.push(url);
  return parts.join(' ');
}

function titleFor(passage: PassageSearchResult): string {
  return passage.documentTitle || passage.fileName || `Document ${passage.documentId}`;
}

export function PassageSearchResults({
  passages,
  searchTerm,
  onDocumentClick,
}: PassageSearchResultsProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus | null>(null);
  const copyStatusTimer = useRef<number | null>(null);
  const headingId = useId();

  useEffect(
    () => () => {
      if (copyStatusTimer.current !== null) window.clearTimeout(copyStatusTimer.current);
    },
    [],
  );

  if (passages.length === 0) return null;

  const handleCopy = async (key: string, label: string, value: string) => {
    try {
      await copyText(value);
      setCopyStatus({ key, message: `${label} copied.`, succeeded: true });
    } catch {
      setCopyStatus({ key, message: `${label} could not be copied.`, succeeded: false });
    }
    if (copyStatusTimer.current !== null) window.clearTimeout(copyStatusTimer.current);
    copyStatusTimer.current = window.setTimeout(() => setCopyStatus(null), 2000);
  };

  return (
    <Surface as="section" variant="glass" className={styles.container} aria-labelledby={headingId}>
      <header className={styles.header}>
        <div className={styles.headingGroup}>
          <span className={styles.headerIcon} aria-hidden="true">
            <Icon name="FileSearch" size="md" />
          </span>
          <div>
            <h2 id={headingId} className={styles.heading}>
              Exact evidence passages
            </h2>
            <p className={styles.subheading}>
              {passages.length} text {passages.length === 1 ? 'match' : 'matches'} for{' '}
              <q>{searchTerm}</q>, linked to source pages
            </p>
          </div>
        </div>
        <Badge tone="accent">
          {passages.length} {passages.length === 1 ? 'passage' : 'passages'}
        </Badge>
      </header>

      <div className={styles.results}>
        {passages.map((passage) => {
          const cardKey = passage.citationId || `${passage.documentId}-${passage.sentenceId}`;
          const pageLabel =
            passage.pageNumber === null ? 'Page not recorded' : `Page ${passage.pageNumber}`;
          const textLink = shareableUrl(passage.textUrl);
          const scanLink = shareableUrl(passage.scanUrl);
          const evidenceLink = textLink || scanLink;
          const linkCopyKey = `${cardKey}:link`;
          const citationCopyKey = `${cardKey}:citation`;
          const linkWasCopied = copyStatus?.key === linkCopyKey && copyStatus.succeeded === true;
          const citationWasCopied =
            copyStatus?.key === citationCopyKey && copyStatus.succeeded === true;

          return (
            <Surface as="article" variant="panel" className={styles.card} key={cardKey}>
              <div className={styles.cardHeader}>
                <div className={styles.titleGroup}>
                  <h3 className={styles.title}>{titleFor(passage)}</h3>
                  {passage.fileName && passage.fileName !== titleFor(passage) && (
                    <span className={styles.fileName}>{passage.fileName}</span>
                  )}
                </div>
                <Badge tone="neutral">{pageLabel}</Badge>
              </div>

              <blockquote className={styles.quote}>{passage.quote || passage.snippet}</blockquote>

              <dl className={styles.metadata}>
                <div className={styles.metadataItem}>
                  <dt>Source</dt>
                  <dd>{sourceLabel(passage)}</dd>
                </div>
                <div className={styles.metadataItem}>
                  <dt>OCR</dt>
                  <dd>{formatOcrConfidence(passage.ocrConfidence)}</dd>
                </div>
                <div className={styles.metadataItem}>
                  <dt>Source family</dt>
                  <dd>{passage.sourceFamily || 'Not recorded'}</dd>
                </div>
                <div className={styles.metadataItem}>
                  <dt>Provenance</dt>
                  <dd>{passage.provenanceStatus || 'Status not recorded'}</dd>
                </div>
                <div className={styles.metadataItem}>
                  <dt>Citation</dt>
                  <dd className={styles.identifier}>{passage.citationId}</dd>
                </div>
                <div className={styles.metadataItem}>
                  <dt>Text location</dt>
                  <dd className={styles.identifier}>
                    {passage.textStart === null || passage.textEnd === null
                      ? 'Offset not mapped'
                      : `${passage.textStart}–${passage.textEnd}`}
                  </dd>
                </div>
                <div className={styles.metadataItem}>
                  <dt>Sentence index</dt>
                  <dd className={styles.identifier}>{passage.sentenceIndex}</dd>
                </div>
                <div className={styles.metadataItem}>
                  <dt>Original asset</dt>
                  <dd className={styles.identifier}>
                    {passage.assetSha256 || 'No pinned scan hash'}
                  </dd>
                </div>
              </dl>

              {passage.matchReason && (
                <p className={styles.matchReason}>
                  <span>Match basis:</span> {passage.matchReason}
                </p>
              )}

              <div className={styles.actions} aria-label={`Actions for ${titleFor(passage)}`}>
                {textLink && (
                  <Button asChild variant="secondary" size="sm" className={styles.action}>
                    <a href={textLink} target="_blank" rel="noopener noreferrer">
                      <Icon name="FileText" size="sm" ariaHidden />
                      Open exact text
                    </a>
                  </Button>
                )}
                {scanLink && (
                  <Button asChild variant="secondary" size="sm" className={styles.action}>
                    <a href={scanLink} target="_blank" rel="noopener noreferrer">
                      <Icon name="FileImage" size="sm" ariaHidden />
                      Open scan
                    </a>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className={styles.action}
                  disabled={!evidenceLink}
                  onClick={() => handleCopy(linkCopyKey, 'Evidence link', evidenceLink)}
                >
                  <Icon name={linkWasCopied ? 'Check' : 'Link2'} size="sm" ariaHidden />
                  {linkWasCopied ? 'Link copied' : 'Copy link'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className={styles.action}
                  onClick={() => handleCopy(citationCopyKey, 'Citation', buildCitation(passage))}
                >
                  <Icon name={citationWasCopied ? 'Check' : 'Copy'} size="sm" ariaHidden />
                  {citationWasCopied ? 'Citation copied' : 'Copy citation'}
                </Button>
                <AddToInvestigationButton
                  item={{
                    id: passage.citationId,
                    title: `${titleFor(passage)} — ${pageLabel}`,
                    description: passage.quote || passage.snippet,
                    type: 'evidence',
                    sourceId: passage.citationId,
                    metadata: {
                      citationId: passage.citationId,
                      citationSchema: passage.citationSchema,
                      documentId: passage.documentId,
                      documentRevisionHash: passage.documentRevisionHash,
                      documentSha256: passage.documentSha256,
                      sentenceId: passage.sentenceId,
                      sentenceIndex: passage.sentenceIndex,
                      pageId: passage.pageId,
                      pageNumber: passage.pageNumber,
                      textStart: passage.textStart,
                      textEnd: passage.textEnd,
                      quoteOccurrence: passage.quoteOccurrence,
                      textSha256: passage.textSha256,
                      exactQuote: passage.quote,
                      assetId: passage.assetId,
                      assetSha256: passage.assetSha256,
                      sourceCollection: passage.sourceCollection,
                      sourceRelease: passage.sourceRelease,
                      sourceFamily: passage.sourceFamily,
                      scanBbox: passage.scanBbox,
                      ocrConfidence: passage.ocrConfidence,
                      provenanceStatus: passage.provenanceStatus,
                      textUrl: textLink,
                      scanUrl: scanLink,
                    },
                  }}
                  variant="button"
                  size="sm"
                  className={styles.action}
                  stopPropagation
                />
                {onDocumentClick && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className={styles.action}
                    onClick={() => onDocumentClick(passage.documentId)}
                  >
                    <Icon name="BookOpen" size="sm" ariaHidden />
                    Open document
                  </Button>
                )}
              </div>
            </Surface>
          );
        })}
      </div>

      <p
        className={styles.copyStatus}
        role="status"
        aria-live="polite"
        data-error={copyStatus ? String(!copyStatus.succeeded) : undefined}
      >
        {copyStatus?.message || ''}
      </p>
    </Surface>
  );
}
