import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, User, Database, Calendar, Eye } from 'lucide-react';
import { Document } from '../../types/documents';
import {
  getRenderTypeIcon,
  getSafePreviewText,
  getRiskClass,
  formatDate,
  getSourceLabel,
  highlightSearchTerm,
} from '../../utils/documentUtils';
import './DocumentCard.css';

interface DocumentCardProps {
  document: Document;
  searchTerm?: string;
  dense?: boolean;
  active?: boolean;
  onClick: (doc: Document) => void;
  onHoverStart?: (doc: Document, rect: DOMRect) => void;
  onHoverEnd?: () => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  searchTerm,
  dense,
  active,
  onClick,
  onHoverStart,
  onHoverEnd,
}) => {
  const cardRef = useRef<HTMLElement>(null);
  const displayTitle = document.title || document.filename || 'Untitled document';
  const previewText = getSafePreviewText(document);
  const risk = Number(document.redFlagRating || 0);
  const entitiesCount = document.entitiesCount || document.entities?.length || 0;
  const iconElement = getRenderTypeIcon(document, { className: 'w-4 h-4' });

  const handleMouseEnter = () => {
    if (onHoverStart && cardRef.current) {
      onHoverStart(document, cardRef.current.getBoundingClientRect());
    }
  };

  return (
    <motion.article
      ref={cardRef}
      data-testid="document-card"
      className={`document-card ${dense ? 'dense' : ''} ${active ? 'active' : ''}`}
      onClick={() => onClick(document)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onHoverEnd}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div className="card-header">
        <div className="card-type-box">
          <div className="card-icon-wrapper">{iconElement}</div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] font-mono">
            {document.sourceType || document.evidenceType || document.fileType}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {document.previewKind === 'ai_summary' && (
            <div
              className="w-7 h-7 flex items-center justify-center rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400"
              title="AI Forensic Summary"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          )}
          <div
            className={`px-2 py-1 rounded border text-[10px] font-black uppercase tracking-tighter flex items-center gap-1.5 ${getRiskClass(risk)}`}
          >
            <div className={`risk-dot risk-level-${risk}`} />R{risk}
          </div>
        </div>
      </div>

      <h3 className="card-title">
        {searchTerm ? highlightSearchTerm(displayTitle, searchTerm) : displayTitle}
      </h3>

      <p className="card-preview">
        {searchTerm ? highlightSearchTerm(previewText, searchTerm) : previewText}
      </p>

      {document.keyEntities && document.keyEntities.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-hidden">
          <User className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
          <div className="text-[10px] text-[var(--text-muted)] truncate font-medium">
            {document.keyEntities.join(' · ')}
          </div>
        </div>
      )}

      <div className="card-meta-row">
        <div className="forensic-chip">
          <Calendar className="w-3 h-3 mr-1 text-[var(--text-muted)]" />
          {formatDate(document.dateCreated)}
        </div>
        <div className="forensic-chip">
          <Eye className="w-3 h-3 mr-1 text-[var(--text-muted)]" />
          {entitiesCount} Ent
        </div>
        <div className="forensic-chip">
          <Database className="w-3 h-3 mr-1 text-[var(--text-muted)]" />
          {getSourceLabel(document)}
        </div>
      </div>
    </motion.article>
  );
};
