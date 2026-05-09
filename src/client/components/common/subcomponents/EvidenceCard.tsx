import React from 'react';
import Icon from '@client/components/common/Icon';
import {
  highlightTerms,
  normalizeEvidenceSnippet,
  isVisualMediaItem,
  resolveEntityPhotoUrl,
} from '@client/utils/evidenceUtils';
import { SignificanceBadge } from '@client/components/entities/SignificanceBadge';
import s from './EvidenceCard.module.css';

import { Button } from '@client/design-system/lib';

export interface EvidenceDocument {
  id?: string | number;
  title?: string;
  fileName?: string;
  filePath?: string;
  fileType?: string;
  documentTitle?: string | null;
  content?: string;
  contentPreview?: string;
  evidenceType?: string;
  redFlagRating?: number;
  keyword?: string;
  dateCreated?: string;
  source_collection?: string;
  significanceScore?: number | null;
}

export interface EvidenceCardProps {
  document: EvidenceDocument;
  onOpen: (id: string | number | undefined, options?: { newTab?: boolean }) => void;
  entityName?: string;
  testId?: string;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  document: doc,
  onOpen,
  entityName,
  testId = 'evidence-card',
}) => {
  const excerpt = normalizeEvidenceSnippet(
    doc.contentPreview || doc.content || doc.title || '',
    doc.title || doc.fileName || `Document ${doc.id}`,
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onOpen(doc.id);
  };

  const isMedia = isVisualMediaItem({
    sourceType: doc.evidenceType,
    filename: doc.title || doc.fileName,
    fileType: doc.fileType,
    filePath: doc.filePath || doc.fileName,
  });
  const mediaUrl = isMedia ? resolveEntityPhotoUrl({ id: doc.id }, true) : null;

  return (
    <article
      data-testid={testId}
      role="button"
      tabIndex={0}
      className={s.card}
      onClick={() => onOpen(doc.id)}
      onKeyDown={handleKeyDown}
    >
      <div className={s.content}>
        <div className={s.header}>
          <div className={s.metadata}>
            <div className={s.typeRow}>
              <span className={s.typePill}>{doc.evidenceType || 'Document'}</span>
              <span className={s.docId}>#{doc.id}</span>
            </div>
            <h4 className={s.title}>
              {doc.documentTitle || doc.title || doc.fileName || `Document ${doc.id}`}
            </h4>
          </div>
          <Button
            unstyled
            onClick={(event) => {
              event.stopPropagation();
              onOpen(doc.id, { newTab: true });
            }}
            className={s.openLink}
          >
            Open <Icon name="ExternalLink" size="xs" />
          </Button>
        </div>
        <div className={s.body}>
          {isMedia && mediaUrl && (
            <div className={s.mediaPreview}>
              <img src={mediaUrl} loading="lazy" alt="Media preview" />
            </div>
          )}
          <p className={s.excerpt}>
            {highlightTerms(excerpt, [entityName, doc.keyword], s.highlight)}
          </p>
        </div>
      </div>

      <div className={s.footer}>
        <span className={s.footerItem}>
          <Icon name="Clock" size="xs" />
          {doc.dateCreated ? new Date(doc.dateCreated).toLocaleDateString() : 'Date unknown'}
        </span>
        <span className={s.footerItem}>
          <Icon name="Link2" size="xs" />
          {doc.source_collection || 'Archive'}
        </span>
        {(doc.redFlagRating || 0) >= 4 && (
          <span className={`${s.footerItem} ${s.warning}`}>
            <Icon name="AlertTriangle" size="xs" />
            High risk score in source.
          </span>
        )}
        {doc.significanceScore != null && doc.significanceScore > 0 && (
          <SignificanceBadge score={doc.significanceScore} showLabel />
        )}
      </div>
    </article>
  );
};
