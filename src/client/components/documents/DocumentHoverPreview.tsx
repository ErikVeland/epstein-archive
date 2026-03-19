import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { Document } from '../../types/documents';
import { getSafePreviewText, getSourceLabel, formatDate } from '../../utils/documentUtils';

interface DocumentHoverPreviewProps {
  doc: Document;
  rect: DOMRect;
}

export const DocumentHoverPreview: React.FC<DocumentHoverPreviewProps> = ({ doc, rect }) => {
  const displayTitle = doc.title || doc.filename || 'Untitled document';
  const previewText = getSafePreviewText(doc);

  // Calculate position
  const x = rect.right + 20 + 420 > window.innerWidth ? rect.left - 420 - 20 : rect.right + 20;
  // Center vertically relative to the card if possible
  const y = Math.max(20, Math.min(window.innerHeight - 500, rect.top + rect.height / 2 - 200));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, x: x < rect.left ? 10 : -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95, x: x < rect.left ? 10 : -10 }}
      style={{ left: x, top: y }}
      className="hover-preview-overlay"
    >
      <div className="preview-glow" />
      <div className="preview-content">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-[var(--accent)]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]/80">
            Document Preview
          </span>
        </div>

        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3 leading-tight">
          {displayTitle}
        </h3>

        <div className="flex flex-wrap gap-2 mb-6">
          <span className="semantic-chip border-[var(--glass-border)] bg-[var(--glass-bg)]/50 text-[var(--text-secondary)]">
            {doc.evidenceType || doc.fileType}
          </span>
          <span className="semantic-chip border-[var(--glass-border)] bg-[var(--glass-bg)]/50 text-[var(--text-secondary)]">
            {formatDate(doc.dateCreated)}
          </span>
          <span className="semantic-chip border-[var(--glass-border)] bg-[var(--glass-bg)]/50 text-[var(--text-secondary)]">
            {getSourceLabel(doc)}
          </span>
        </div>

        <div className="preview-ocr-snippet">{previewText}</div>

        {doc.keyEntities && doc.keyEntities.length > 0 && (
          <div className="mt-6">
            <div className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-2 tracking-widest">
              Key Detected Entities
            </div>
            <div className="flex flex-wrap gap-2">
              {doc.keyEntities.slice(0, 8).map((entity, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded text-[11px] text-[var(--accent)]"
                >
                  {entity}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
