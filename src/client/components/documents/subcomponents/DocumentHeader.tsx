import React from 'react';
import { Calendar, Download, FileText, Search, ArrowLeft } from 'lucide-react';
import { CloseButton } from '../../common/CloseButton';
import { formatDate } from '../DocumentModalUtils';

interface DocumentHeaderProps {
  doc: Record<string, any>;
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
    <div className="flex flex-col lg:flex-row lg:items-center gap-5 py-6 px-8 min-w-0 border-b border-[var(--glass-border)] bg-transparent relative z-10 glass-panel">
      <div className="flex items-start lg:items-center gap-5 w-full lg:w-auto min-w-0">
        <div className="w-14 h-14 rounded-[var(--radius-lg)] bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] flex items-center justify-center shrink-0 shadow-[var(--glass-shadow)] backdrop-blur-md">
          <FileText className="w-7 h-7 text-[var(--accent)] opacity-90 block" />
        </div>
        <div className="min-w-0 flex-1 pl-1">
          <h2
            id="document-modal-title"
            className="text-2xl md:text-3xl font-display font-medium text-text-strong tracking-tight truncate leading-tight group"
          >
            {doc.title || doc.fileName}
          </h2>
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <span
              className={`px-3 py-1 rounded-[var(--radius-sm)] text-[10px] font-bold uppercase tracking-widest border ${
                doc.evidenceType === 'email'
                  ? 'bg-[var(--glass-bg)] text-[var(--accent-emails)] border-[var(--accent-emails)]/20 shadow-sm shadow-[var(--accent-emails)]/10'
                  : 'bg-[var(--glass-bg)] text-text-dim border-[var(--glass-border)]'
              }`}
            >
              {doc.evidenceType || doc.fileType || 'Unclassified Record'}
            </span>
            <span className="text-[10px] uppercase font-bold text-text-muted tracking-widest flex items-center gap-2 font-mono">
              <Calendar className="w-3.5 h-3.5 opacity-70" />
              {formatDate(doc.dateModified || doc.updatedAt || doc.dateModified)}
            </span>
          </div>
        </div>
      </div>

      <div className="ml-auto flex flex-wrap lg:flex-nowrap items-center gap-3 w-full lg:w-auto mt-4 lg:mt-0 lg:pl-6 border-t border-[var(--glass-border)] lg:border-t-0 lg:border-l pt-4 lg:pt-0">
        <div className="relative group w-full lg:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-[var(--accent)] transition-colors block leading-none" />
          <input
            type="text"
            placeholder="Find in record..."
            className="control !h-12 w-full !pl-12 !pr-4 !bg-[var(--glass-bg)] border-[var(--glass-border)] focus:!border-[var(--accent)] transition-all text-sm font-medium text-text-strong rounded-[var(--radius-md)] placeholder:text-text-muted/60 focus:bg-transparent shadow-inner focus:shadow-none"
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
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform block" />
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
          <Download className="w-5 h-5 block" />
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
