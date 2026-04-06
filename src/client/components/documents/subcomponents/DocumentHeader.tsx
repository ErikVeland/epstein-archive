import React from 'react';
import { Calendar, Download, FileText, Search, ArrowLeft } from 'lucide-react';
import { CloseButton } from '../../common/CloseButton';
import { formatDate } from '../DocumentModalUtils';
import styles from './DocumentHeader.module.css';

interface DocumentHeaderProps {
  doc: {
    title?: string | null;
    fileName?: string | null;
    evidenceType?: string | null;
    fileType?: string | null;
    dateModified?: string | null;
    updatedAt?: string | null;
  };
  localSearchTerm: string;
  setLocalSearchTerm: (value: string) => void;
  canReturnToCase: boolean;
  handleBackToCase: () => void;
  downloadOriginalDocument: () => void;
  onClose: () => void;
}

export const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  doc,
  localSearchTerm,
  setLocalSearchTerm,
  canReturnToCase,
  handleBackToCase,
  downloadOriginalDocument,
  onClose,
}) => {
  return (
    <div className={`surface-glass-header bg-transparent ${styles.header}`}>
      <div className={styles.titleGroup}>
        <div className={`surface-glass ${styles.iconBox}`}>
          <FileText size={28} className={styles.fileIcon} />
        </div>
        <div className={styles.titleMeta}>
          <h2 id="document-modal-title" className={styles.docTitle}>
            {doc.title || doc.fileName}
          </h2>
          <div className={styles.badgeRow}>
            <span
              className={`${styles.typeBadge} ${
                doc.evidenceType === 'email'
                  ? 'surface-glass text-[var(--accent-emails)] border-[var(--accent-emails)]/20 shadow-sm shadow-[var(--accent-emails)]/10'
                  : 'surface-glass text-text-dim'
              }`}
            >
              {doc.evidenceType || doc.fileType || 'Unclassified Record'}
            </span>
            <span className={styles.dateBadge}>
              <Calendar size={14} className={styles.calendarIcon} />
              {formatDate(doc.dateModified || doc.updatedAt || doc.dateModified)}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={`${styles.searchWrapper} group`}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Find in record..."
            className="control !h-12 w-full !pl-12 !pr-4 surface-glass focus:!border-[var(--accent)] transition-all text-sm font-medium text-text-strong rounded-[var(--radius-md)] placeholder:text-text-muted/60 focus:bg-transparent shadow-inner focus:shadow-none"
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            name="document_record_search"
          />
        </div>

        {canReturnToCase && (
          <button
            onClick={handleBackToCase}
            className="control !h-12 px-5 flex items-center gap-2 text-text-muted hover:text-text-strong group whitespace-nowrap"
          >
            <ArrowLeft
              size={16}
              className="group-hover:-translate-x-1 transition-transform block"
            />
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">
              Case
            </span>
          </button>
        )}
        <button
          onClick={downloadOriginalDocument}
          className="control !h-12 w-12 flex items-center justify-center text-text-muted hover:text-[var(--accent)]"
          title="Download Original Document"
        >
          <Download size={20} />
        </button>
        <CloseButton
          onClick={onClose}
          size="md"
          label="Close"
          className="!h-12 !w-12 text-text-muted hover:text-[var(--risk-critical)] hover:border-[var(--risk-critical)]/30"
        />
      </div>
    </div>
  );
};

export default DocumentHeader;
