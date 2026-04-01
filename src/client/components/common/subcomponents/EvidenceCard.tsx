import React from 'react';
import { ExternalLink, Clock, Link2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { highlightTerms, normalizeEvidenceSnippet } from '../../../utils/evidenceUtils';
import s from './EvidenceCard.module.css';

export interface EvidenceDocument {
  id?: string | number;
  title?: string;
  fileName?: string;
  content?: string;
  contentPreview?: string;
  evidenceType?: string;
  redFlagRating?: number;
  keyword?: string;
  dateCreated?: string;
  source_collection?: string;
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

  const significanceReason =
    (doc.redFlagRating || 0) >= 4
      ? 'High risk score in source record.'
      : doc.evidenceType
        ? `Matched in ${doc.evidenceType} evidence.`
        : 'Directly linked through entity mention context.';

  return (
    <button data-testid={testId} type="button" className={s.card} onClick={() => onOpen(doc.id)}>
      <div className={s.content}>
        <div className={s.header}>
          <div className={s.metadata}>
            <div className={s.typeRow}>
              <span className={s.typePill}>{doc.evidenceType || 'Document'}</span>
              <span className={s.docId}>#{doc.id}</span>
            </div>
            <h4 className={s.title}>{doc.title || doc.fileName || `Document ${doc.id}`}</h4>
          </div>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onOpen(doc.id, { newTab: true });
            }}
            className={s.openLink}
          >
            Open <ExternalLink size={12} />
          </button>
        </div>
        <p className={s.excerpt}>
          {highlightTerms(excerpt, [entityName, doc.keyword], s.highlight)}
        </p>
      </div>

      <div className={s.footer}>
        <span className={s.footerItem}>
          <Clock size={10} />
          {doc.dateCreated ? new Date(doc.dateCreated).toLocaleDateString() : 'Date unknown'}
        </span>
        <span className={s.footerItem}>
          <Link2 size={10} />
          {doc.source_collection || 'Archive'}
        </span>
        <span className={`${s.footerItem} ${s.warning}`}>
          <AlertTriangle size={10} />
          {significanceReason}
        </span>
        <span className={`${s.footerItem} ${s.provenance}`}>
          <ShieldCheck size={10} />
          #PROV-VERIFIED
        </span>
      </div>
    </button>
  );
};
